import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { Phone, MapPin, Mail, MessageCircle } from 'lucide-react';

export function Footer() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const solutionLinks = [
    { label: isRTL ? 'تحكم في الإضاءة' : 'Control Lighting', href: '/products?category=lighting' },
    { label: isRTL ? 'أمّن منزلك' : 'Secure My Home', href: '/products?category=security' },
    { label: isRTL ? 'وفّر الكهرباء' : 'Save Electricity', href: '/products?category=energy' },
    { label: isRTL ? 'تحكم في التكييف' : 'Control AC Remotely', href: '/products?category=climate' },
    { label: isRTL ? 'ستائر ذكية' : 'Smart Curtains', href: '/products?category=curtains' },
    { label: isRTL ? 'باقات المنزل الذكي' : 'Smart Home Kits', href: '/bundles' },
  ];

  const supportLinks = [
    { label: isRTL ? 'المستشار الذكي' : 'AI Advisor', href: '/ai-consultant' },
    { label: isRTL ? 'حاسبة التكلفة' : 'Cost Calculator', href: '/calculator' },
    { label: isRTL ? 'خدمات التركيب' : 'Installation Services', href: '/services' },
    { label: isRTL ? 'عن بيتزكي' : 'About Baytzaki', href: '/about' },
  ];

  const legalLinks = [
    { key: 'terms', en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
    { key: 'privacy', en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    { key: 'refund', en: 'Refund Policy', ar: 'سياسة الإرجاع' },
    { key: 'shipping', en: 'Shipping Policy', ar: 'سياسة الشحن' },
    { key: 'warranty', en: 'Warranty', ar: 'الضمان' },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-6 md:px-12 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Contact */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                BAYTZAKI
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {isRTL
                ? 'نجعل كل بيت مصري ذكي وموفر للطاقة. مستشار ذكي + متجر + تركيب.'
                : 'Making every Egyptian home smart & energy-efficient. AI Advisor + Store + Installation.'}
            </p>
            <div className="space-y-3 text-sm">
              <a href="tel:+201234567890" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4 text-primary" />
                +20 123 456 7890
              </a>
              <a href="https://wa.me/201234567890" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="h-4 w-4 text-success" />
                WhatsApp
              </a>
              <a href="mailto:info@baytzaki.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4 text-primary" />
                info@baytzaki.com
              </a>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>{isRTL ? 'القاهرة، مصر' : 'Cairo, Egypt'}</span>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              {isRTL ? 'الحلول' : 'Solutions'}
            </h4>
            <ul className="space-y-3">
              {solutionLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              {isRTL ? 'الدعم' : 'Support'}
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              {isRTL ? 'نثق بنا' : 'Why Trust Us'}
            </h4>
            <div className="space-y-3">
              {[
                { icon: '✅', label: isRTL ? 'ضمان رسمي ٢ سنة' : '2-Year Official Warranty' },
                { icon: '🚚', label: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery' },
                { icon: '🔧', label: isRTL ? 'تركيب احترافي' : 'Professional Installation' },
                { icon: '🏠', label: isRTL ? '١٠٠٠+ منزل ذكي' : '1,000+ Smart Homes' },
                { icon: '📞', label: isRTL ? 'دعم ٢٤/٧' : '24/7 Support' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            {legalLinks.map((link) => (
              <Link key={link.key} to={`/legal/${link.key}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isRTL ? link.ar : link.en}
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Baytzaki. {t('allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
