import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { enablePushNotifications, isPushEnabled } from '@/lib/push';
import { useLanguage } from '@/lib/i18n';

export function PushNotificationsButton() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(() => isPushEnabled());

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    enablePushNotifications().then((res) => {
      if ('error' in res) setEnabled(false);
    });
  }, [enabled]);

  const handle = async () => {
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
        description: isRTL ? 'ستصلك تنبيهات العروض والطلبات.' : "You'll get alerts for deals and order updates.",
      });
    }
  };

  return (
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
  );
}
