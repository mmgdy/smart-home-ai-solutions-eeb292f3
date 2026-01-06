import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ar';

// Translations for the app
export const translations = {
  en: {
    // Header
    home: 'Home',
    products: 'Products',
    aiConsultant: 'AI Consultant',
    services: 'Services',
    
    // Hero Section
    aiPoweredSolutions: 'AI-Powered Smart Home Solutions',
    makeHomeSmarter: 'Make Your Home',
    smarter: 'Smarter',
    heroDescription: 'Discover premium smart home products and get personalized recommendations from our AI consultant. Transform your living space with cutting-edge technology.',
    buildSmartHome: 'Build Your Smart Home',
    browseProducts: 'Browse Products',
    smartLighting: 'Smart Lighting',
    smartLightingDesc: 'Control ambiance with voice & app',
    homeSecurity: 'Home Security',
    homeSecurityDesc: 'Keep your home safe 24/7',
    climateControl: 'Climate Control',
    climateControlDesc: 'Optimize comfort & energy',
    
    // Featured Products
    featuredProducts: 'Featured Products',
    featuredProductsDesc: 'Handpicked smart home essentials for your modern lifestyle',
    viewAll: 'View All',
    viewAllProducts: 'View All Products',
    noFeaturedProducts: 'No featured products available',
    
    // AI Consultant CTA
    letAIHelp: 'Let AI Help You',
    aiConsultantTitle: 'Build Your Perfect Smart Home',
    aiConsultantDesc: 'Our AI-powered consultant analyzes your needs and recommends the perfect combination of smart home products. Get a personalized solution in minutes.',
    startConsultation: 'Start AI Consultation',
    
    // Products Page
    smartHomeProducts: 'Smart Home Products',
    discoverPremium: 'Discover premium devices to transform your living space',
    searchProducts: 'Search products...',
    filters: 'Filters',
    categories: 'Categories',
    allProducts: 'All Products',
    activeFilters: 'Active filters:',
    showing: 'Showing',
    product: 'product',
    productsPlural: 'products',
    noProducts: 'No products found',
    
    // Product Detail
    backToProducts: 'Back to Products',
    save: 'Save',
    inStock: 'In Stock',
    available: 'available',
    outOfStock: 'Out of Stock',
    addToCart: 'Add to Cart',
    specifications: 'Specifications',
    productNotFound: 'Product Not Found',
    productNotFoundDesc: "The product you're looking for doesn't exist.",
    
    // Product Card
    addedToCart: 'Added to cart',
    hasBeenAdded: 'has been added to your cart.',
    featured: 'Featured',
    
    // Cart
    cart: 'Cart',
    yourCartEmpty: 'Your cart is empty',
    cartEmptyDesc: "Looks like you haven't added any products yet. Start shopping to fill your cart!",
    shoppingCart: 'Shopping Cart',
    clearCart: 'Clear Cart',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    calculatedAtCheckout: 'Calculated at checkout',
    total: 'Total',
    proceedToCheckout: 'Proceed to Checkout',
    secureCheckout: 'Secure checkout powered by Stripe',
    
    // Services
    ourServices: 'Our Services',
    servicesDesc: 'We offer professional installation and support services to help you get the most out of your smart home.',
    smartHomeInstallation: 'Smart Home Installation',
    smartHomeInstallationDesc: 'Professional installation of all smart home devices. Our certified technicians ensure everything works perfectly.',
    systemConfiguration: 'System Configuration',
    systemConfigurationDesc: 'Complete setup and configuration of your smart home ecosystem. Automations, scenes, and voice control setup included.',
    consultation: 'Consultation',
    consultationDesc: 'One-on-one consultation to plan your smart home journey. Get expert advice on products and setup.',
    from: 'From',
    learnMore: 'Learn More',
    needCustomSolution: 'Need a Custom Solution?',
    customSolutionDesc: 'Contact us for enterprise installations, large-scale projects, or custom automation requirements.',
    contactUs: 'Contact Us',
    
    // AI Consultant Page
    comingSoon: 'Coming Soon',
    aiConsultantPageTitle: 'AI Smart Home Consultant',
    aiConsultantPageDesc: 'Our AI-powered consultant will help you build the perfect smart home setup. Just describe your needs and get personalized product recommendations.',
    
    // Footer
    footerTagline: 'Making homes smarter, one device at a time. Your trusted partner for smart home solutions.',
    shop: 'Shop',
    lighting: 'Lighting',
    security: 'Security',
    support: 'Support',
    installationServices: 'Installation Services',
    contact: 'Contact',
    allRightsReserved: 'All rights reserved.',
    
    // Currency
    egp: 'EGP',
  },
  ar: {
    // Header
    home: 'الرئيسية',
    products: 'المنتجات',
    aiConsultant: 'المستشار الذكي',
    services: 'الخدمات',
    
    // Hero Section
    aiPoweredSolutions: 'حلول المنزل الذكي المدعومة بالذكاء الاصطناعي',
    makeHomeSmarter: 'اجعل منزلك',
    smarter: 'أذكى',
    heroDescription: 'اكتشف منتجات المنزل الذكي المميزة واحصل على توصيات مخصصة من مستشارنا الذكي. حوّل مساحة معيشتك بأحدث التقنيات.',
    buildSmartHome: 'ابني منزلك الذكي',
    browseProducts: 'تصفح المنتجات',
    smartLighting: 'الإضاءة الذكية',
    smartLightingDesc: 'تحكم في الأجواء بالصوت والتطبيق',
    homeSecurity: 'أمان المنزل',
    homeSecurityDesc: 'حافظ على أمان منزلك على مدار الساعة',
    climateControl: 'التحكم في المناخ',
    climateControlDesc: 'تحسين الراحة والطاقة',
    
    // Featured Products
    featuredProducts: 'منتجات مميزة',
    featuredProductsDesc: 'أساسيات المنزل الذكي المختارة بعناية لأسلوب حياتك العصري',
    viewAll: 'عرض الكل',
    viewAllProducts: 'عرض جميع المنتجات',
    noFeaturedProducts: 'لا توجد منتجات مميزة',
    
    // AI Consultant CTA
    letAIHelp: 'دع الذكاء الاصطناعي يساعدك',
    aiConsultantTitle: 'ابني منزلك الذكي المثالي',
    aiConsultantDesc: 'مستشارنا المدعوم بالذكاء الاصطناعي يحلل احتياجاتك ويوصي بالمزيج المثالي من منتجات المنزل الذكي. احصل على حل مخصص في دقائق.',
    startConsultation: 'ابدأ الاستشارة',
    
    // Products Page
    smartHomeProducts: 'منتجات المنزل الذكي',
    discoverPremium: 'اكتشف الأجهزة المميزة لتحويل مساحة معيشتك',
    searchProducts: 'ابحث عن المنتجات...',
    filters: 'الفلاتر',
    categories: 'الفئات',
    allProducts: 'جميع المنتجات',
    activeFilters: 'الفلاتر النشطة:',
    showing: 'عرض',
    product: 'منتج',
    productsPlural: 'منتجات',
    noProducts: 'لم يتم العثور على منتجات',
    
    // Product Detail
    backToProducts: 'العودة للمنتجات',
    save: 'وفر',
    inStock: 'متوفر',
    available: 'متاح',
    outOfStock: 'غير متوفر',
    addToCart: 'أضف للسلة',
    specifications: 'المواصفات',
    productNotFound: 'المنتج غير موجود',
    productNotFoundDesc: 'المنتج الذي تبحث عنه غير موجود.',
    
    // Product Card
    addedToCart: 'تمت الإضافة للسلة',
    hasBeenAdded: 'تمت إضافته إلى سلة التسوق.',
    featured: 'مميز',
    
    // Cart
    cart: 'السلة',
    yourCartEmpty: 'سلة التسوق فارغة',
    cartEmptyDesc: 'يبدو أنك لم تضف أي منتجات بعد. ابدأ التسوق لملء سلتك!',
    shoppingCart: 'سلة التسوق',
    clearCart: 'إفراغ السلة',
    orderSummary: 'ملخص الطلب',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    calculatedAtCheckout: 'يُحسب عند الدفع',
    total: 'الإجمالي',
    proceedToCheckout: 'المتابعة للدفع',
    secureCheckout: 'دفع آمن مدعوم من Stripe',
    
    // Services
    ourServices: 'خدماتنا',
    servicesDesc: 'نقدم خدمات التركيب والدعم المهنية لمساعدتك في الاستفادة القصوى من منزلك الذكي.',
    smartHomeInstallation: 'تركيب المنزل الذكي',
    smartHomeInstallationDesc: 'تركيب احترافي لجميع أجهزة المنزل الذكي. فنيونا المعتمدون يضمنون عمل كل شيء بشكل مثالي.',
    systemConfiguration: 'تهيئة النظام',
    systemConfigurationDesc: 'إعداد وتهيئة كاملة لمنظومة منزلك الذكي. تشمل الأتمتة والسيناريوهات والتحكم الصوتي.',
    consultation: 'استشارة',
    consultationDesc: 'استشارة فردية لتخطيط رحلة منزلك الذكي. احصل على نصيحة خبير حول المنتجات والإعداد.',
    from: 'من',
    learnMore: 'اعرف المزيد',
    needCustomSolution: 'تحتاج حل مخصص؟',
    customSolutionDesc: 'تواصل معنا للتركيبات المؤسسية والمشاريع الكبيرة أو متطلبات الأتمتة المخصصة.',
    contactUs: 'تواصل معنا',
    
    // AI Consultant Page
    comingSoon: 'قريباً',
    aiConsultantPageTitle: 'مستشار المنزل الذكي',
    aiConsultantPageDesc: 'مستشارنا المدعوم بالذكاء الاصطناعي سيساعدك في بناء إعداد المنزل الذكي المثالي. فقط صف احتياجاتك واحصل على توصيات منتجات مخصصة.',
    
    // Footer
    footerTagline: 'نجعل المنازل أذكى، جهاز تلو الآخر. شريكك الموثوق لحلول المنزل الذكي.',
    shop: 'التسوق',
    lighting: 'الإضاءة',
    security: 'الأمان',
    support: 'الدعم',
    installationServices: 'خدمات التركيب',
    contact: 'التواصل',
    allRightsReserved: 'جميع الحقوق محفوظة.',
    
    // Currency
    egp: 'ج.م',
  },
};

type Translations = typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
  formatPrice: (price: number) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: keyof Translations): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const formatPrice = (price: number): string => {
    // Format price in Egyptian Pounds
    if (language === 'ar') {
      return `${price.toLocaleString('ar-EG')} ${translations.ar.egp}`;
    }
    return `${translations.en.egp} ${price.toLocaleString('en-EG')}`;
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    // Update document direction and lang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatPrice, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
