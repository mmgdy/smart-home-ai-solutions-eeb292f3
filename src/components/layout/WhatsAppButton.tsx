import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function WhatsAppButton() {
  const { isRTL } = useLanguage();
  const phone = '201234567890'; // Placeholder Egyptian phone number
  const message = encodeURIComponent('Hi Baytzaki! I need help with smart home products.');

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-[hsl(142,70%,45%)] text-[hsl(0,0%,100%)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group",
        isRTL ? "left-6" : "right-6"
      )}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-semibold hidden sm:inline">
        {isRTL ? 'تحدث معنا' : 'Chat with us'}
      </span>
    </a>
  );
}
