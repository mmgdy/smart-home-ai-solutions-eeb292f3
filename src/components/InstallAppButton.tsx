import { useEffect, useState } from 'react';
import { Download, Share, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallAppButton({ className }: { className?: string }) {
  const { language } = useLanguage();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIos = typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isStandalone || installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleClick}
        className={className}
      >
        <Download className="h-4 w-4" />
        <span className="hidden md:inline">
          {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
        </span>
      </Button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-display text-lg font-semibold">
              {language === 'ar' ? 'ثبّت Baytzaki على شاشتك الرئيسية' : 'Install Baytzaki on your Home Screen'}
            </h3>
            {isIos ? (
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 text-primary" />
                {language === 'ar' ? 'اضغط زر المشاركة في Safari' : 'Tap the Share button in Safari'}
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-primary" />
                {language === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Choose "Add to Home Screen"'}
              </li>
            </ol>
            ) : (
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 text-primary" />
                {language === 'ar'
                  ? 'افتح قائمة المتصفح (⋮) ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"'
                  : 'Open your browser menu (⋮) and choose "Install app" or "Add to Home screen"'}
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-primary" />
                {language === 'ar'
                  ? 'للحصول على أفضل تجربة، استخدم Chrome أو Edge على Android، أو Safari على iPhone.'
                  : 'For the best experience, use Chrome / Edge on Android or Safari on iPhone.'}
              </li>
            </ol>
            )}
            <Button className="mt-5 w-full" onClick={() => setShowIosHelp(false)}>
              {language === 'ar' ? 'حسناً' : 'Got it'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}