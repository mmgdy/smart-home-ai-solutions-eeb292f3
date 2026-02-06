import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export function Footer() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const footerLinks = [
    {
      title: t('shop'),
      links: [
        { label: t('allProducts'), href: '/products' },
        { label: t('lighting') || 'Lighting', href: '/products?category=lighting' },
        { label: t('security') || 'Security', href: '/products?category=security' },
        { label: t('climateControl'), href: '/products?category=climate' },
      ],
    },
    {
      title: t('support'),
      links: [
        { label: t('aiConsultant'), href: '/ai-consultant' },
        { label: t('installationServices') || 'Services', href: '/services' },
        { label: t('contactUs') || 'Contact', href: '/contact' },
      ],
    },
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
      <div className="container px-6 md:px-12 py-20">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                BAYTZAKI
              </span>
            </Link>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
              {t('footerTagline')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Twitter
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Instagram
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                LinkedIn
              </a>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-semibold text-foreground mb-6">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-8 border-t border-border">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {legalLinks.map((link) => (
              <Link
                key={link.key}
                to={`/legal/${link.key}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isRTL ? link.ar : link.en}
              </Link>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Baytzaki. {t('allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
