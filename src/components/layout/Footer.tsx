import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { Phone, MapPin, Mail, MessageCircle, Facebook, Instagram, Youtube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import defaultLogoImage from '@/assets/logo.png';

export function Footer() {
  const { t, language } = useLanguage();
  const { get } = useSiteInfo();
  const isRTL = language === 'ar';
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoImage);
  const [logoSize, setLogoSize] = useState(60);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['logo_url', 'logo_size']);
      data?.forEach((s) => {
        if (s.key === 'logo_url' && s.value) setLogoUrl(s.value);
        if (s.key === 'logo_size' && s.value) setLogoSize(Math.min(parseInt(s.value), 80));
      });
    })();
  }, []);

  const phone = get('contact', 'phone', '+20 123 456 7890');
  const whatsapp = get('contact', 'whatsapp', '201234567890').replace(/\D/g, '');
  const email = get('contact', 'email', 'info@baytzaki.com');
  const address = isRTL ? get('contact', 'address_ar', 'القاهرة، مصر') : get('contact', 'address_en', 'Cairo, Egypt');

  const fb = get('social', 'facebook', '');
  const ig = get('social', 'instagram', '');
  const tt = get('social', 'tiktok', '');
  const yt = get('social', 'youtube', '');

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
    { label: isRTL ? 'الماركات' : 'Brands', href: '/brands' },
    { label: isRTL ? 'عن بيت زكي' : 'About Baytzaki', href: '/about' },
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
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center mb-4">
              <img src={logoUrl} alt="Baytzaki" style={{ height: `${logoSize}px` }} className="object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {isRTL
                ? 'نجعل كل بيت مصري ذكي وموفر للطاقة. مستشار ذكي + متجر + تركيب.'
                : 'Making every Egyptian home smart & energy-efficient. AI Advisor + Store + Installation.'}
            </p>
            <div className="space-y-3 text-sm">
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4 text-primary" />{phone}
              </a>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 text-success" />WhatsApp
                </a>
              )}
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4 text-primary" />{email}
              </a>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5" /><span>{address}</span>
              </div>
            </div>

            {(fb || ig || tt || yt) && (
              <div className="flex gap-3 mt-5">
                {fb && <a href={fb} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Facebook className="h-4 w-4" /></a>}
                {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Instagram className="h-4 w-4" /></a>}
                {yt && <a href={yt} target="_blank" rel="noreferrer" aria-label="YouTube" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Youtube className="h-4 w-4" /></a>}
                {tt && <a href={tt} target="_blank" rel="noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-xs font-bold">TT</a>}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'الحلول' : 'Solutions'}</h4>
            <ul className="space-y-3">
              {solutionLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'الدعم' : 'Support'}</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'نثق بنا' : 'Why Trust Us'}</h4>
            <div className="space-y-3">
              {[
                { icon: '✅', label: isRTL ? 'ضمان رسمي ٢ سنة' : '2-Year Official Warranty' },
                { icon: '🚚', label: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery' },
                { icon: '🔧', label: isRTL ? 'تركيب احترافي' : 'Professional Installation' },
                { icon: '🏠', label: isRTL ? '١٠٠٠+ منزل ذكي' : '1,000+ Smart Homes' },
                { icon: '📞', label: isRTL ? 'دعم ٢٤/٧' : '24/7 Support' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
