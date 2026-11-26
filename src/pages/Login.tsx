import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useLanguage } from "@/lib/i18n";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, isRTL } = useLanguage();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const isAr = language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const labels = {
    title: isAr ? "تسجيل الدخول" : "Sign In",
    welcome: isAr ? "مرحباً بك في أزكاسمارت" : "Welcome to AzkaSmart",
    signInToContinue:
      next !== "/"
        ? isAr
          ? "سجّل الدخول للمتابعة والعودة إلى ما كنت تقوم به."
          : "Sign in to continue and return to what you were doing."
        : isAr
        ? "سجّل الدخول للمتابعة."
        : "Sign in to continue.",
    signInWithGoogle: isAr ? "تسجيل الدخول باستخدام Google" : "Sign in with Google",
    orWithEmail: isAr ? "أو بالبريد الإلكتروني" : "or with email",
    tabSignIn: isAr ? "تسجيل الدخول" : "Sign In",
    tabSignUp: isAr ? "إنشاء حساب" : "Sign Up",
    email: isAr ? "البريد الإلكتروني" : "Email",
    password: isAr ? "كلمة المرور" : "Password",
    fullName: isAr ? "الاسم الكامل" : "Full Name",
    passwordMin: isAr ? "كلمة المرور (٦ أحرف على الأقل)" : "Password (min 6 characters)",
    btnSignIn: isAr ? "تسجيل الدخول" : "Sign In",
    btnSignUp: isAr ? "إنشاء حساب" : "Create Account",
    verificationNotice: isAr
      ? "سنرسل لك رابط تفعيل لتأكيد حسابك."
      : "We'll send you a verification link to activate your account.",
    backToStore: isAr ? "العودة للمتجر" : "Back to store",
    signInFailed: isAr ? "فشل تسجيل الدخول" : "Sign in failed",
    signUpFailed: isAr ? "فشل إنشاء الحساب" : "Sign up failed",
    checkEmail: isAr ? "تحقق من بريدك الإلكتروني" : "Check your email",
    verificationSent: isAr
      ? "أرسلنا لك رابط تفعيل لتأكيد حسابك."
      : "We sent you a verification link to activate your account.",
    googleFailed: isAr ? "فشل تسجيل الدخول بجوجل" : "Google sign in failed",
    checkCredentials: isAr ? "تحقق من بياناتك" : "Check your credentials",
    tryAgain: isAr ? "حاول مرة أخرى" : "Please try again",
  };

  useEffect(() => {
    // Supabase redirects back with ?error_description=... when the OAuth
    // flow fails or was denied — surface it instead of silently ignoring it.
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      toast({
        variant: "destructive",
        title: labels.signInFailed,
        description: oauthError,
      });
    }

    // Picks up the session created by the Google OAuth redirect (the client
    // exchanges the code on init), then sends the user on their way.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(next, { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        navigate(next, { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next, params, toast, labels.signInFailed]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      return toast({
        variant: "destructive",
        title: labels.signInFailed,
        description: error.message || labels.checkCredentials,
      });
    }
    navigate(next, { replace: true });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: { full_name: fullName.trim() },
      },
    });
    setBusy(false);
    if (error) {
      return toast({
        variant: "destructive",
        title: labels.signUpFailed,
        description: error.message || labels.tryAgain,
      });
    }
    toast({
      title: labels.checkEmail,
      description: labels.verificationSent,
    });
  };

  const onGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      toast({
        variant: "destructive",
        title: labels.googleFailed,
        description: error.message,
      });
    }
    // On success the browser redirects to Google — nothing more to do here.
  };

  return (
    <>
      <Helmet>
        <title>{`${labels.title} | AzkaSmart`}</title>
      </Helmet>
      <main
        className="min-h-screen flex items-center justify-center p-6 bg-background"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl mb-1 text-foreground">{labels.welcome}</h1>
          <p className="text-sm text-muted-foreground mb-4">{labels.signInToContinue}</p>

          <Button
            variant="outline"
            className="w-full mb-4 gap-2"
            onClick={onGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            {labels.signInWithGoogle}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {labels.orWithEmail}
              </span>
            </div>
          </div>

          <Tabs defaultValue="signin" dir={isRTL ? "rtl" : "ltr"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{labels.tabSignIn}</TabsTrigger>
              <TabsTrigger value="signup">{labels.tabSignUp}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">{labels.email}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    dir="ltr"
                    className="text-start"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password">{labels.password}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    minLength={6}
                    dir="ltr"
                    className="text-start"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.btnSignIn}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">{labels.fullName}</Label>
                  <Input
                    id="signup-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">{labels.email}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    dir="ltr"
                    className="text-start"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">{labels.passwordMin}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    dir="ltr"
                    className="text-start"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.btnSignUp}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {labels.verificationNotice}
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground underline transition-colors"
            >
              <BackArrow className="h-3.5 w-3.5" />
              <span>{labels.backToStore}</span>
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}