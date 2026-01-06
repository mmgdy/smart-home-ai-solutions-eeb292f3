import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="font-display text-lg font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Baytzaki
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('footerTagline')}
            </p>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">{t('shop')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors">{t('allProducts')}</Link></li>
              <li><Link to="/products?category=lighting" className="text-muted-foreground hover:text-foreground transition-colors">{t('lighting')}</Link></li>
              <li><Link to="/products?category=security" className="text-muted-foreground hover:text-foreground transition-colors">{t('security')}</Link></li>
              <li><Link to="/products?category=climate" className="text-muted-foreground hover:text-foreground transition-colors">{t('climateControl')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">{t('support')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/ai-consultant" className="text-muted-foreground hover:text-foreground transition-colors">{t('aiConsultant')}</Link></li>
              <li><Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">{t('installationServices')}</Link></li>
              <li><a href="mailto:support@baytzaki.com" className="text-muted-foreground hover:text-foreground transition-colors">{t('contactUs')}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">{t('contact')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@baytzaki.com</li>
              <li dir="ltr">+20 (10) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Baytzaki. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}
