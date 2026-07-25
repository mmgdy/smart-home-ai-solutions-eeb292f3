// Web Push (FCM) helpers — initialize Firebase, register the messaging SW
// with the public web config (fetched from edge function), request permission,
// and persist the FCM token to push_subscriptions for broadcasts.
//
// Supports: iOS 16.4+ Safari (PWA), Android Chrome, desktop Chrome/Edge/Firefox
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/integrations/supabase/config';

type FbConfig = {
  apiKey: string; authDomain: string; projectId: string;
  messagingSenderId: string; appId: string;
};

let cached: { app: FirebaseApp; messaging: Messaging; vapidKey: string } | null = null;

const STORAGE_KEY = 'baytzaki_push_enabled';

// Check if running inside a preview iframe (Lovable/StackBlitz editors)
const isPreview = () => {
  if (typeof window === 'undefined') return true;
  try {
    // Only treat as preview if it's an actual editor — allow iframed PWAs
    const h = window.location.hostname;
    return (
      h.startsWith('id-preview--') ||
      h.startsWith('preview--') ||
      h.endsWith('.lovableproject.com') ||
      h.endsWith('.lovableproject-dev.com') ||
      h.endsWith('.beta.lovable.dev')
    );
  } catch { return false; }
};

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
  try { return await isSupported(); } catch { return false; }
}

/** Check if user has previously enabled push (persists across sessions). */
export function isPushEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

/** Clear the persisted push state (e.g. after permission denial). */
export function clearPushState(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

async function fetchFirebaseConfig(): Promise<{ config: FbConfig; vapidKey: string }> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/firebase-config`);
  if (!resp.ok) throw new Error('Firebase config unavailable');
  return resp.json();
}

async function init(): Promise<{ messaging: Messaging; vapidKey: string }> {
  if (cached) return cached;
  const { config, vapidKey } = await fetchFirebaseConfig();
  const app = initializeApp(config);
  const messaging = getMessaging(app);
  cached = { app, messaging, vapidKey };
  return cached;
}

export async function enablePushNotifications(): Promise<{ token: string } | { error: string }> {
  try {
    if (isPreview()) return { error: 'Push notifications work in the published app, not in the editor preview.' };
    if (!(await isPushSupported())) return { error: 'Push notifications are not supported on this browser/device.' };

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      clearPushState();
      return { error: 'Notification permission denied.' };
    }

    const { config, vapidKey } = await fetchFirebaseConfig();

    // Register the messaging SW with the Firebase config baked into the URL.
    const cfgB64 = btoa(JSON.stringify(config));
    const swUrl = `/firebase-messaging-sw.js?cfg=${encodeURIComponent(cfgB64)}&v=${Date.now()}`;

    // Always replace the Firebase worker so older registrations without the
    // config query can start handling background messages.
    const existingRegs = await navigator.serviceWorker.getRegistrations();
    for (const r of existingRegs) {
      const scriptURL = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
      if (scriptURL.includes('firebase-messaging-sw')) {
        await r.unregister();
      }
    }

    const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    await navigator.serviceWorker.ready;

    const { messaging } = await init();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { error: 'Could not get notification token.' };

    // Detect platform for better targeting
    const ua = navigator.userAgent;
    const platform = /iPhone|iPad|iPod/.test(ua) ? 'ios'
      : /Android/.test(ua) ? 'android'
      : 'web';

    // Persist token (best-effort upsert via select-then-insert; ignore duplicates).
    const { data: existing } = await supabase
      .from('push_subscriptions').select('id,enabled').eq('fcm_token', token).maybeSingle();
    if (!existing) {
      const { data: { user } } = await supabase.auth.getUser();
      const insertErr = (await supabase.from('push_subscriptions').insert({
        fcm_token: token,
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        platform,
        locale: navigator.language || 'en',
        user_agent: ua.slice(0, 255),
      })).error;
      if (insertErr && insertErr.code !== '23505') {
        console.warn('push_subscriptions insert error:', insertErr.message);
      }
    } else if (!existing.enabled) {
      // Re-enable if it was disabled
      await supabase.from('push_subscriptions').update({ enabled: true }).eq('id', existing.id);
    }

    // Persist enabled state in localStorage for UI persistence
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ }

    // Foreground messages — show a toast-style notification.
    onMessage(messaging, (payload) => {
      const n = payload.notification;
      if (n?.title && 'Notification' in window) {
        new Notification(n.title, {
          body: n.body,
          icon: n.icon || '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: n.click_action || payload.data?.url || '/' },
        });
      }
    });

    return { token };
  } catch (e: any) {
    clearPushState();
    return { error: e?.message || 'Failed to enable notifications' };
  }
}
