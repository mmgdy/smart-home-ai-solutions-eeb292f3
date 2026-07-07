import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { enablePushNotifications, isPushEnabled } from '@/lib/push';
import { useLanguage } from '@/lib/i18n';

export function PushNotificationsButton() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(() => isPushEnabled());
  const [showIosGuide, setShowIosGuide] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true);
  // iOS 16.4+ web push only works when the app is installed to the home screen.
  const iosNeedsInstall = isIos && !isStandalone;

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    enablePushNotifications().then((res) => {
      if ('error' in res) setEnabled(false);
    });
  }, [enabled]);

  const handle = async () => {
    if (iosNeedsInstall) { setShowIosGuide(true); return; }
    setBusy(true);
    const res = await enablePushNotifications();
    setBusy(false);
    if ('error' in res) {
      setEnabled(false);
      toast({ variant: 'destructive', title: isRTL ? 'لم يتم التفعيل' : 'Not enabled', description: res.error });
    } else {
      setEnabled(true);
      toast({
        title: isRTL ? 'تم تفعيل الإشعارات' : 'Notifications enabled',
        description: isRTL
          ? `تم حفظ الجهاز: ${res.token.slice(-12)}`
          : `Device saved: ${res.token.slice(-12)}`,
      });
    }
  };

  return (
    <>
      <Button variant={enabled ? 'secondary' : 'default'} onClick={handle} disabled={busy} className="gap-2">
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : enabled
            ? <Bell className="h-4 w-4" />
            : <BellOff className="h-4 w-4" />}
        {enabled
          ? (isRTL ? 'الإشعارات مفعّلة' : 'Notifications on')
          : (isRTL ? 'فعّل الإشعارات' : 'Enable notifications')}
      </Button>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              {isRTL ? 'ثبّت التطبيق أولاً على iPhone' : 'Install the app first on iPhone'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isRTL
                ? 'يتطلب iOS تثبيت التطبيق على الشاشة الرئيسية قبل تفعيل الإشعارات (iOS 16.4 أو أحدث).'
                : 'iOS requires the app to be added to your Home Screen before push notifications can work (iOS 16.4+).'}
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 text-primary" />
                {isRTL ? 'افتح Safari واضغط زر المشاركة' : 'Open in Safari and tap the Share button'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                {isRTL ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Choose "Add to Home Screen"'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">3.</span>
                {isRTL ? 'افتح التطبيق من الشاشة الرئيسية وفعّل الإشعارات' : 'Launch the app from your Home Screen, then tap Enable notifications'}
              </li>
            </ol>
            <Button className="mt-5 w-full" onClick={() => setShowIosGuide(false)}>
              {isRTL ? 'حسناً' : 'Got it'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
