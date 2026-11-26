import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { cn } from '@/lib/utils';

export function WhatsAppButton() {
  const { isRTL } = useLanguage();
  const { pathname } = useLocation();
  const { get } = useSiteInfo();
  const raw = get('contact', 'whatsapp', '201501896456') || '201501896456';
  const digits = raw.replace(/\D/g, '');
  const phone = digits.startsWith('0') ? '2' + digits : (digits || '201501896456');
  const message = encodeURIComponent(
    isRTL ? 'مرحباً أزكاسمارت! أود الاستفسار عن منتجات وخدمات المنزل الذكي.' : 'Hi AzkaSmart! I need help with smart home products.'
  );

  const isProductDetail = /^\/products\/[^/]+/.test(pathname);
  const hasBottomActionArea = isProductDetail || pathname === '/cart' || pathname === '/checkout';

  if (!phone) return null;

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={isRTL ? 'تحدث معنا عبر واتساب' : 'Chat with us on WhatsApp'}
      className={cn(
        "fixed z-whatsapp flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] px-4 sm:px-5 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-300/30 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.65)] hover:shadow-[0_14px_38px_-8px_rgba(16,185,129,0.85)] transition-all duration-300 hover:scale-105 group",
        hasBottomActionArea ? "bottom-24 lg:bottom-6" : "bottom-6",
        isRTL ? "left-4 sm:left-6" : "right-4 sm:right-6",
      )}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-semibold hidden sm:inline">
        {isRTL ? 'تحدث معنا' : 'Chat with us'}
      </span>
    </a>
  );
}
