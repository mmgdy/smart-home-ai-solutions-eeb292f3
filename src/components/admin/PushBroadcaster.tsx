import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Loader2, Send } from 'lucide-react';
import { PushNotificationsButton } from '@/components/PushNotificationsButton';

export function PushBroadcaster({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title || !message) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Title and message are required.' });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { token: adminToken, title, message, url, image: image || undefined },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (!data.total_subscribers) {
        toast({
          variant: 'destructive',
          title: 'No subscribed devices',
          description: 'Enable notifications on at least one device, then send the broadcast again.',
        });
        return;
      }

      const firstFailure = data.results?.find((result: { ok: boolean }) => !result.ok);
      toast({
        title: 'Broadcast sent',
        description: [
          `Delivered to ${data.sent} of ${data.total_subscribers} device(s) - ${data.failed} failed - ${data.disabled_stale} stale disabled.`,
          firstFailure ? `First error: ${firstFailure.error || 'unknown'}` : '',
        ].filter(Boolean).join(' '),
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Broadcast failed', description: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-primary" /> Push Notification Broadcast
        </h2>
        <p className="text-sm text-muted-foreground">
          Send a notification to every device that has enabled alerts. Works on Android, desktop browsers, and installed iOS PWAs (iOS 16.4+).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">This device</Label>
          <p className="text-sm text-muted-foreground">Enable this browser before sending a test broadcast.</p>
        </div>
        <PushNotificationsButton />
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Flash sale - 20% off smart lights" />
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Hurry - sale ends tonight." />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Open URL on tap</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/products" />
        </div>
        <div className="space-y-2">
          <Label>Image URL (optional)</Label>
          <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <Button onClick={send} disabled={busy} size="lg">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Send broadcast
      </Button>
    </div>
  );
}
