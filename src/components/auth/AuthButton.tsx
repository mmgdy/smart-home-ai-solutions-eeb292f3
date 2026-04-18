import { useState } from 'react';
import { LogOut, User, Loader2, LogIn as LogInIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showProfile?: boolean;
}

export const AuthButton = ({ variant = 'outline', size = 'default', showProfile = true }: AuthButtonProps) => {
  const { user, loading, signOut } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const isAr = language === 'ar';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast({ title: isAr ? 'مرحباً بعودتك!' : 'Welcome back!' });
      setOpen(false);
      setPassword('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: isAr ? 'فشل تسجيل الدخول' : 'Sign in failed',
        description: err?.message || (isAr ? 'تحقق من بياناتك' : 'Check your credentials'),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      toast({
        title: isAr ? 'تحقق من بريدك' : 'Check your email',
        description: isAr ? 'أرسلنا رابط التفعيل لبريدك' : 'We sent you a verification link to activate your account.',
      });
      setOpen(false);
      setPassword('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: isAr ? 'فشل التسجيل' : 'Sign up failed',
        description: err?.message || (isAr ? 'حاول مرة أخرى' : 'Please try again'),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {showProfile && (
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline max-w-[120px] truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </Button>
          </Link>
        )}
        <Button variant={variant} size={size} onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{isAr ? 'خروج' : 'Sign Out'}</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-2">
        <LogInIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{isAr ? 'دخول' : 'Sign In'}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {isAr ? 'مرحباً ببيتزاكي' : 'Welcome to Baytzaki'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'سجل دخول أو أنشئ حساب جديد' : 'Sign in or create a new account'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="signin" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{isAr ? 'تسجيل الدخول' : 'Sign In'}</TabsTrigger>
              <TabsTrigger value="signup">{isAr ? 'إنشاء حساب' : 'Sign Up'}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{isAr ? 'كلمة المرور' : 'Password'}</Label>
                  <Input id="signin-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? 'دخول' : 'Sign In')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{isAr ? 'الاسم الكامل' : 'Full Name'}</Label>
                  <Input id="signup-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{isAr ? 'كلمة المرور (٦ أحرف على الأقل)' : 'Password (min 6 chars)'}</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAr ? 'إنشاء حساب' : 'Create Account')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {isAr ? 'هنبعتلك إيميل تفعيل' : "We'll send you a verification email"}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
