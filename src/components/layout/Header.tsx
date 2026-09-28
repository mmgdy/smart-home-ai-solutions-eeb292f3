import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Home,
  Smartphone,
  Shield,
  Package,
  Wrench,
  ShoppingBag,
  Calculator,
  Award,
  Info,
  MessageCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import defaultLogoImage from '@/assets/logo.png';
import defaultLogoDark from '@/assets/logo-dark.png';
import { AuthButton } from '@/components/auth/AuthButton';
import { InstallAppButton } from '@/components/InstallAppButton';
import { AISearchDialog } from '@/components/AISearchDialog';
import { useTheme } from '@/lib/theme';
import { ThemeSlider } from '@/components/theme/ThemeSlider';
import { useSiteInfo } from '@/hooks/useSiteInfo';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoDefault, setLogoDefault] = useState<string>(() => {
    try { return localStorage.getItem('azka_logo_default') || defaultLogoImage; } catch { return defaultLogoImage; }
  });
  const [logoLight, setLogoLight] = useState<string | null>(() => {
    try { return localStorage.getItem('azka_logo_light') || defaultLogoImage; } catch { return defaultLogoImage; }
  });
  const [logoDark, setLogoDark] = useState<string | null>(() => {
    try { return localStorage.getItem('azka_logo_dark') || defaultLogoDark; } catch { return defaultLogoDark; }
  });
  const [logoSize, setLogoSize] = useState(120);
  const { theme } = useTheme();
  const itemCount = useCart((state) => state.getItemCount());
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { get: getSiteInfo } = useSiteInfo();
  const navigate = useNavigate();

  const rawWhatsapp = getSiteInfo('contact', 'whatsapp', '01501896456') || '01501896456';
  const digits = rawWhatsapp.replace(/\D/g, '');
  const whatsappPhone = digits.startsWith('0') ? '2' + digits : digits;

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
          .in('key', ['logo_url', 'logo_light_url', 'logo_dark_url', 'logo_size']);
        if (settings) {
          settings.forEach(s => {
            if (s.key === 'logo_url' && s.value) {
              setLogoDefault(s.value);
              try { localStorage.setItem('azka_logo_default', s.value); } catch {}
            }
            if (s.key === 'logo_light_url' && s.value) {
              setLogoLight(s.value);
              try { localStorage.setItem('azka_logo_light', s.value); } catch {}
            }
            if (s.key === 'logo_dark_url' && s.value) {
              setLogoDark(s.value);
              try { localStorage.setItem('azka_logo_dark', s.value); } catch {}
            }
            if (s.key === 'logo_size' && s.value) setLogoSize(parseInt(s.value));
          });
        }
      } catch { console.log('Using default logo'); }
    };
    loadLogoSettings();

    const handleSettingsUpdate = () => loadLogoSettings();
    window.addEventListener('azka-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('azka-settings-updated', handleSettingsUpdate);
  }, []);

  const currentLogo = theme === 'dark'
    ? (logoDark || logoDefault)
    : (logoLight || logoDefault);

  // Problem-based emotional navigation
  const navLinks = [
    {
      href: '/ai-consultant',
      label: isRTL ? 'اجعل بيتي ذكي' : 'Make My Home Smart',
      desc: isRTL ? 'استشارة فورية لاختيار النظام الأنسب' : 'AI-guided customized home setup',
      badge: isRTL ? 'مستشار AI' : 'AI Advisor',
      icon: Home,
      accent: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      href: '/app-simulator',
      label: isRTL ? 'جرّب التطبيقات' : 'Try the Apps',
      desc: isRTL ? 'محاكاة تفاعلية لتطبيقات التحكم' : 'Interactive app simulator & demo',
      badge: isRTL ? 'تجربة حية' : 'Live Demo',
      icon: Smartphone,
      accent: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      href: '/products?category=security',
      label: isRTL ? 'أمّن عائلتي' : 'Protect Family',
      desc: isRTL ? 'أقفال وكاميرات وحساسات أمان' : 'Smart locks, cameras & sensors',
      badge: null,
      icon: Shield,
      accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      href: '/bundles',
      label: isRTL ? 'باقات التوفير' : 'Smart Bundles',
      desc: isRTL ? 'حلول متكاملة جاهزة للتركيب' : 'Complete curated smart packs',
      badge: isRTL ? 'وفر أكثر' : 'Best Value',
      icon: Package,
      accent: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      href: '/services',
      label: isRTL ? 'احجز التركيب' : 'Book Install',
      desc: isRTL ? 'مهندسون وفنيون معتمدون وضمان' : 'Certified setup & full warranty',
      badge: null,
      icon: Wrench,
      accent: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
  ];

  const quickLinks = [
    {
      href: '/products',
      label: isRTL ? 'جميع المنتجات' : 'All Products',
      icon: ShoppingBag,
    },
    {
      href: '/calculator',
      label: isRTL ? 'حاسبة التكلفة' : 'Cost Calculator',
      icon: Calculator,
    },
    {
      href: '/brands',
      label: isRTL ? 'أشهر الماركات' : 'Top Brands',
      icon: Award,
    },
    {
      href: '/about',
      label: isRTL ? 'عن أزكاسمارت' : 'About Us',
      icon: Info,
    },
  ];

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled
        ? "bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-sm"
        : "bg-background/80 backdrop-blur-md border-b border-border/30"
    )}>
      <div className="container flex h-16 md:h-20 items-center justify-between px-3 sm:px-6 md:px-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={currentLogo}
            alt="AzkaSmart"
            style={{ height: `${Math.min(logoSize, 56)}px` }}
            className="object-contain transition-all duration-300 max-h-12 sm:max-h-14"
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

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <AuthButton variant="ghost" size="sm" />
          </div>

          <AISearchDialog />

          <div className="hidden md:flex items-center gap-2">
            <InstallAppButton />
          </div>

          {/* Theme & Language on screens >= sm */}
          <div className="hidden sm:inline-flex items-center">
            <ThemeSlider />
          </div>
          <div className="hidden sm:inline-flex items-center">
            <LanguageToggle />
          </div>

          {/* Cart Icon */}
          <Link to="/cart" className="relative group shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-foreground/5 text-foreground"
              aria-label={isRTL ? "سلة المشتريات" : "Shopping Cart"}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className={cn(
                  "absolute -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-50",
                  isRTL ? "-left-1" : "-right-1"
                )}>
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Drawer (Radix Sheet portals to document.body, escaping backdrop-filter clipping) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="h-9 w-9 rounded-xl lg:hidden bg-secondary/80 hover:bg-secondary border-border/80 text-foreground shrink-0 shadow-sm flex items-center justify-center transition-all"
                aria-label={isRTL ? "القائمة الرئيسية" : "Main menu"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side={isRTL ? "right" : "left"}
              className="w-[88vw] max-w-sm p-0 flex flex-col bg-background/98 backdrop-blur-2xl border-border/80 shadow-2xl z-[100] h-full"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-background/60 pe-14">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2"
                >
                  <img
                    src={currentLogo}
                    alt="AzkaSmart"
                    className="h-8 object-contain"
                  />
                </Link>
                <SheetHeader className="sr-only">
                  <SheetTitle>{isRTL ? 'القائمة الرئيسية' : 'Main Navigation'}</SheetTitle>
                </SheetHeader>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                {/* AI Assistant Banner */}
                <Link
                  to="/ai-consultant"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block p-3.5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 hover:border-primary/40 transition-all shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      {isRTL ? 'مساعد أزكا الذكي' : 'Azka AI Advisor'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {isRTL ? 'مجاناً' : 'FREE'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground/90 leading-relaxed">
                    {isRTL
                      ? 'صمم نظام بيتك الذكي واحصل على باقة مخصصة في دقيقتين'
                      : 'Design your custom smart home setup in 2 minutes'}
                  </p>
                </Link>

                {/* Primary Solution Links */}
                <div>
                  <div className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {isRTL ? 'الحلول والخدمات' : 'Solutions & Services'}
                  </div>
                  <div className="space-y-1.5">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-card/50 hover:bg-card border border-border/40 hover:border-border transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("p-2 rounded-lg border shrink-0", link.accent)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 text-start">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {link.label}
                                </span>
                                {link.badge && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-secondary text-secondary-foreground border border-border/50">
                                    {link.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {link.desc}
                              </p>
                            </div>
                          </div>
                          <ArrowIcon className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Catalog & Quick Tools */}
                <div>
                  <div className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {isRTL ? 'الكتالوج والأدوات' : 'Explore & Tools'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/40 hover:bg-card border border-border/40 hover:border-border transition-all group"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {link.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* WhatsApp Quick Assistance */}
                {whatsappPhone && (
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                      isRTL
                        ? 'مرحباً أزكاسمارت! أود الاستفسار عن منتجات وخدمات المنزل الذكي.'
                        : 'Hi AzkaSmart! I need help with smart home products.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 transition-all text-emerald-600 dark:text-emerald-400 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0 shadow-sm">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div className="text-start">
                        <span className="text-xs font-bold block">
                          {isRTL ? 'استشارة سريعة عبر واتساب' : 'Quick WhatsApp Support'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {isRTL ? 'فريق المهندسين متاح لمساعدتك' : 'Expert engineers ready to help'}
                        </span>
                      </div>
                    </div>
                    <ArrowIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                  </a>
                )}
              </div>

              {/* Drawer Footer Preferences & Account */}
              <div className="p-4 border-t border-border/50 bg-muted/20 space-y-3 shrink-0">
                {/* Theme & Language Toggles in Mobile Drawer */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card/60 border border-border/40">
                  {/* Language switch */}
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                    aria-label={isRTL ? "تغيير اللغة" : "Switch language"}
                  >
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{language === 'en' ? 'العربية' : 'English'}</span>
                  </button>

                  {/* Theme slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {theme === 'dark' ? (isRTL ? 'ليلي' : 'Dark') : (isRTL ? 'نهاري' : 'Light')}
                    </span>
                    <ThemeSlider />
                  </div>
                </div>

                {/* Account & App Install Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <AuthButton variant="outline" size="sm" className="w-full justify-center text-xs h-9" />
                  </div>
                  <div className="flex-1">
                    <InstallAppButton />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

