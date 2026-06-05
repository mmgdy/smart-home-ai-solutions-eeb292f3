// Web Push (FCM) helpers — initialize Firebase, register the messaging SW
// with the public web config (fetched from edge function), request permission,
// and persist the FCM token to push_subscriptions for broadcasts.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/integrations/supabase/config';

type FbConfig = {
  apiKey: string; authDomain: string; projectId: string;
  messagingSenderId: string; appId: string;
};

let cached: { app: FirebaseApp; messaging: Messaging; vapidKey: string } | null = null;

const isPreview = () => {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    h.startsWith('id-preview--') ||
    h.startsWith('preview--') ||
    h.endsWith('.lovableproject.com') ||
    h.endsWith('.lovableproject-dev.com') ||
    h.endsWith('.beta.lovable.dev') ||
    window.self !== window.top
  );
};

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
  return await isSupported().catch(() => false);
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
    if (perm !== 'granted') return { error: 'Notification permission denied.' };

    const { config, vapidKey } = await fetchFirebaseConfig();
    // Register the messaging SW with the public Firebase config baked into the URL.
    const cfgB64 = btoa(JSON.stringify(config));
    const reg = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?cfg=${encodeURIComponent(cfgB64)}`,
      { scope: '/' },
    );
    await navigator.serviceWorker.ready;

    const { messaging } = await init();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { error: 'Could not get notification token.' };

    // Persist token (best-effort upsert via select-then-insert; ignore duplicates).
    const { data: existing } = await supabase
      .from('push_subscriptions').select('id').eq('fcm_token', token).maybeSingle();
    if (!existing) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('push_subscriptions').insert({
        fcm_token: token,
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        platform: 'web',
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 255) : null,
      });
    }

    // Foreground messages — show a simple toast-style notification.
    onMessage(messaging, (payload) => {
      const n = payload.notification;
      if (n?.title && 'Notification' in window) {
        new Notification(n.title, { body: n.body, icon: n.icon || '/icons/icon-192.png' });
      }
    });

    return { token };
  } catch (e: any) {
    return { error: e?.message || 'Failed to enable notifications' };
  }
}