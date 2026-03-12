import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import defaultLogoImage from '@/assets/logo.png';
import { AuthButton } from '@/components/auth/AuthButton';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoImage);
  const [logoSize, setLogoSize] = useState(100);
  const itemCount = useCart((state) => state.getItemCount());
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadLogoSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', ['logo_url', 'logo_size']);
        if (settings) {
          settings.forEach(s => {
            if (s.key === 'logo_url' && s.value) setLogoUrl(s.value);
            if (s.key === 'logo_size' && s.value) setLogoSize(parseInt(s.value));
          });
        }
      } catch { console.log('Using default logo'); }
    };
    loadLogoSettings();
  }, []);

  // Problem-based emotional navigation
  const navLinks = [
    { href: '/ai-consultant', label: isRTL ? 'اجعل بيتي ذكي' : 'Make My Home Smart', icon: '🏠' },
    { href: '/products?category=lighting', label: isRTL ? 'تحكم في الإضاءة' : 'Control Lights', icon: '💡' },
    { href: '/products?category=security', label: isRTL ? 'أمّن عائلتي' : 'Protect Family', icon: '🛡️' },
    { href: '/bundles', label: isRTL ? 'الباقات' : 'Bundles', icon: '📦' },
    { href: '/services', label: isRTL ? 'احجز التركيب' : 'Book Install', icon: '🔧' },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      scrolled
        ? "bg-background/90 backdrop-blur-xl border-b border-border/50"
        : "bg-transparent"
    )}>
      <div className="container flex h-16 md:h-20 items-center justify-between px-4 md:px-12">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={logoUrl}
            alt="Baytzaki"
            style={{ height: `${Math.min(logoSize, 60)}px` }}
            className="object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <AuthButton variant="ghost" size="sm" />
          <LanguageToggle />
          <Link to="/cart" className="relative group">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-foreground/5">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className={cn(
                  "absolute -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
                  isRTL ? "-left-1" : "-right-1"
                )}>
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden hover:bg-foreground/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-background/98 backdrop-blur-xl z-40 lg:hidden">
          <nav className="flex flex-col items-center justify-center h-full gap-6 p-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-display font-bold text-foreground hover:text-primary transition-colors flex items-center gap-3"
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-border w-full max-w-xs">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="block text-center text-muted-foreground hover:text-foreground py-2">
                {isRTL ? 'جميع المنتجات' : 'All Products'}
              </Link>
              <Link to="/calculator" onClick={() => setMobileMenuOpen(false)} className="block text-center text-muted-foreground hover:text-foreground py-2">
                {isRTL ? 'حاسبة التكلفة' : 'Cost Calculator'}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
