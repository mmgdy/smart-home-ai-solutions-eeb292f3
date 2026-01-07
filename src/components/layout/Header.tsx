import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = useCart((state) => state.getItemCount());
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/products', label: t('products') },
    { href: '/ai-consultant', label: t('aiConsultant') },
    { href: '/services', label: t('services') },
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      scrolled 
        ? "bg-background/80 backdrop-blur-xl border-b border-border/50" 
        : "bg-transparent"
    )}>
      <div className="container flex h-20 items-center justify-between px-6 md:px-12">
        {/* Logo - Minimal text only */}
        <Link to="/" className="flex items-center">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            BAYTZAKI
          </span>
        </Link>

        {/* Desktop Navigation - Minimal, spaced out */}
        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              to={link.href}
              className="text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
          <LanguageToggle />
          
          <Link to="/cart" className="relative group">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full hover:bg-foreground/5"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className={cn(
                  "absolute -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background",
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
            className="h-10 w-10 rounded-full md:hidden hover:bg-foreground/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation - Full screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 bg-background z-40 md:hidden">
          <nav className="flex flex-col items-center justify-center h-full gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-3xl font-display font-bold text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
