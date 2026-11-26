import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { Phone, MapPin, Mail, MessageCircle, Facebook, Instagram, Youtube, ShieldCheck, Truck, Wrench, Home, Headphones } from 'lucide-react';
import { loadBrandingSettings, resolveBrandingAssetUrl } from '@/lib/favicon';
import defaultLogoImage from '@/assets/logo.png';
import defaultLogoDark from '@/assets/logo-dark.png';
import { useTheme } from '@/lib/theme';

export function Footer() {
  const { t, language } = useLanguage();
  const { get } = useSiteInfo();
  const { theme } = useTheme();
  const isRTL = language === 'ar';
  const [logoDefault, setLogoDefault] = useState<string>(() => {
    try { return resolveBrandingAssetUrl(localStorage.getItem('azka_logo_default'), 'logo-light', defaultLogoImage); } catch { return defaultLogoImage; }
  });
  const [logoLight, setLogoLight] = useState<string | null>(() => {
    try { return resolveBrandingAssetUrl(localStorage.getItem('azka_logo_light'), 'logo-light', defaultLogoImage); } catch { return defaultLogoImage; }
  });
  const [logoDark, setLogoDark] = useState<string | null>(() => {
    try { return resolveBrandingAssetUrl(localStorage.getItem('azka_logo_dark'), 'logo-dark', defaultLogoDark); } catch { return defaultLogoDark; }
  });
  const [logoSize, setLogoSize] = useState(80);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await loadBrandingSettings();
        if (settings.logo_url) {
          const resolved = resolveBrandingAssetUrl(settings.logo_url, 'logo-light', defaultLogoImage);
          setLogoDefault(resolved);
          try { localStorage.setItem('azka_logo_default', resolved); } catch {}
        }
        if (settings.logo_light_url) {
          const resolved = resolveBrandingAssetUrl(settings.logo_light_url, 'logo-light', defaultLogoImage);
          setLogoLight(resolved);
          try { localStorage.setItem('azka_logo_light', resolved); } catch {}
        }
        if (settings.logo_dark_url) {
          const resolved = resolveBrandingAssetUrl(settings.logo_dark_url, 'logo-dark', defaultLogoDark);
          setLogoDark(resolved);
          try { localStorage.setItem('azka_logo_dark', resolved); } catch {}
        }
        if (settings.logo_size) setLogoSize(Math.min(parseInt(settings.logo_size), 80));
      } catch {
        // Keep default logo fallback
      }
    };
    loadLogo();
    const handleSettingsUpdate = () => loadLogo();
    window.addEventListener('azka-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('azka-settings-updated', handleSettingsUpdate);
  }, []);

  const currentLogo = theme === 'dark'
    ? (logoDark || logoDefault)
    : (logoLight || logoDefault);

  const phone = get('contact', 'phone', '01501896456') || '01501896456';
  const rawWa = (get('contact', 'whatsapp', '201501896456') || '201501896456').replace(/\D/g, '');
  const whatsapp = rawWa.startsWith('0') ? '2' + rawWa : (rawWa || '201501896456');
  const email = get('contact', 'email', 'info@azkasmart.com') || 'info@azkasmart.com';
  const address = isRTL
    ? (get('contact', 'address_ar', 'برج 4، شارع التسعين الشمالي، القاهرة الجديدة، مصر') || 'برج 4، شارع التسعين الشمالي، القاهرة الجديدة، مصر')
    : (get('contact', 'address_en', 'Tower 4, Northern 90th St, New Cairo, Egypt') || 'Tower 4, Northern 90th St, New Cairo, Egypt');

  const fb = get('social', 'facebook', 'https://www.facebook.com/azkasmartcom') || 'https://www.facebook.com/azkasmartcom';
  const ig = get('social', 'instagram', 'https://www.instagram.com/azkasmart') || 'https://www.instagram.com/azkasmart';
  const tt = get('social', 'tiktok', 'https://www.tiktok.com/@azkasmart.eg') || 'https://www.tiktok.com/@azkasmart.eg';
  const yt = get('social', 'youtube', 'https://www.youtube.com/@azkasmart_eg') || 'https://www.youtube.com/@azkasmart_eg';

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
    { label: isRTL ? 'عن أزكاسمارت' : 'About AzkaSmart', href: '/about' },
    { label: isRTL ? 'الملف التعريفي للشركة' : 'Company Profile', href: '/company-profile' },
    { label: isRTL ? 'تواصل معنا' : 'Contact', href: '/contact' },
  ];

  const legalLinks = [
    { key: 'terms', en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
    { key: 'privacy', en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    { key: 'refund', en: 'Refund Policy', ar: 'سياسة الإرجاع' },
    { key: 'shipping', en: 'Shipping Policy', ar: 'سياسة الشحن' },
    { key: 'warranty', en: 'Warranty', ar: 'الضمان' },
  ];

  return (
    <footer className="relative bg-card/85 backdrop-blur-xl border-t border-border/80 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div className="container relative z-10 px-6 md:px-12 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center mb-4">
              <img src={currentLogo} alt="AzkaSmart" style={{ height: `${logoSize}px` }} className="object-contain transition-all duration-300" />
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
                {fb && <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Facebook className="h-4 w-4" /></a>}
                {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Instagram className="h-4 w-4" /></a>}
                {tt && (
                  <a href={tt} target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                )}
                {yt && <a href={yt} target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube" className="w-9 h-9 rounded-full bg-muted hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors"><Youtube className="h-4 w-4" /></a>}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'الحلول' : 'Solutions'}</h4>
            <ul className="space-y-3">
              {solutionLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'الدعم' : 'Support'}</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{isRTL ? 'نثق بنا' : 'Why Trust Us'}</h4>
            <div className="space-y-3">
              {[
                { icon: ShieldCheck, label: isRTL ? 'ضمان رسمي لمدة سنة' : '1-Year Official Warranty' },
                { icon: Truck, label: isRTL ? 'توصيل لجميع المحافظات' : 'Nationwide Delivery' },
                { icon: Wrench, label: isRTL ? 'تركيب احترافي' : 'Professional Installation' },
                { icon: Home, label: isRTL ? '١٠٠٠+ منزل ذكي' : '1,000+ Smart Homes' },
                { icon: Headphones, label: isRTL ? 'دعم ٢٤/٧' : '24/7 Support' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm text-foreground/80">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
                    <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/80">
          <div className="flex flex-wrap justify-center gap-5 mb-4">
            {legalLinks.map((link) => (
              <Link key={link.key} to={`/legal/${link.key}`} className="text-xs font-medium text-foreground/75 hover:text-primary transition-colors">
                {isRTL ? link.ar : link.en}
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-foreground/75">
            {isRTL ? (
              <>
                جميع الحقوق محفوظة لـ{' '}
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                  AzkaSmart © {new Date().getFullYear()}
                </span>
              </>
            ) : (
              `© ${new Date().getFullYear()} AzkaSmart. ${t('allRightsReserved')}`
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
