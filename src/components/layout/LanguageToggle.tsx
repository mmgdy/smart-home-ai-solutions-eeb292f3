import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      aria-label={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
      className="gap-1 sm:gap-1.5 min-h-[44px] min-w-[44px] px-2 lg:min-h-0 lg:min-w-0 lg:px-3"
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span className="text-xs font-semibold sm:hidden">
        {language === 'en' ? 'ع' : 'EN'}
      </span>
      <span className="hidden sm:inline text-sm font-medium">
        {language === 'en' ? 'العربية' : 'English'}
      </span>
    </Button>
  );
}
