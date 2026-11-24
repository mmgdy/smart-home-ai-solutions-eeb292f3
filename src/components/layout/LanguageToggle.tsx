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
      className="gap-1.5 min-h-[44px] min-w-[44px] px-2.5 lg:min-h-0 lg:min-w-0 lg:px-3"
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span className="text-xs sm:text-sm font-medium">
        {language === 'en' ? 'العربية' : 'English'}
      </span>
    </Button>
  );
}
