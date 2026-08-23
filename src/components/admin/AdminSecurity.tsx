import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Loader2, Copy, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminSecurityProps {
  adminToken: string;
  adminEmail?: string | null;
  onLogout: () => void;
}

/**
 * Admin credential reset. The generated password is held in component state
 * only: it is never written to localStorage, never logged, and is discarded
 * as soon as the admin acknowledges it or leaves the tab.
 */
export function AdminSecurity({ adminToken, adminEmail, onLogout }: AdminSecurityProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Defensive wipe: never leave the secret in memory after unmount.
  useEffect(() => () => setCredential(null), []);

  const handleReset = async () => {
    setBusy(true);
    setRevealed(false);
    setCopied(false);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'reset-password' },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (error || !data?.success || !data?.password) {
        throw new Error(data?.error || error?.message || 'Reset failed');
      }
      setCredential({ email: data.email, password: data.password });
      toast({
        title: 'New password generated',
        description: 'Copy it now — it will not be shown again.',
      });
    } catch (e: any) {
      toast({ title: 'Reset failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!credential) return;
    await navigator.clipboard.writeText(credential.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    setCredential(null);
    setRevealed(false);
    // Every other session was revoked server-side; sign out so the admin
    // re-authenticates with the new password.
    onLogout();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Admin credentials</h2>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{adminEmail || 'admin'}</span>.
            Resetting generates a strong 24-character password, shows it once, and signs
            out every other admin session.
          </p>
        </div>
      </div>

      {!credential ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Reset admin password
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the admin password?</AlertDialogTitle>
              <AlertDialogDescription>
                The current password stops working immediately and all other admin
                sessions are revoked. The new password is displayed only once — make
                sure you can store it somewhere safe before continuing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Generate new password</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Shown once — it cannot be retrieved later.
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="font-mono text-sm break-all">{credential.email}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">New password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 font-mono text-sm break-all select-all">
                {revealed ? credential.password : '•'.repeat(credential.password.length)}
              </code>
              <Button variant="outline" size="icon" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? 'Hide password' : 'Reveal password'}>
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy password">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={handleDone}>
            I saved it — sign out
          </Button>
        </div>
      )}
    </div>
  );
}
