import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Leaf,
  Lightbulb,
  Thermometer,
  Shield,
  Zap,
  Blinds,
  Speaker,
  Mic,
  Wifi,
  Bot,
  Calculator,
  LayoutDashboard,
  Smartphone,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  Award,
  CheckCircle2,
  FileText,
  Building2,
  Compass,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/lib/i18n';
import profileData from '@/data/companyProfile.json';
import './CompanyProfile.css';

// Map icon strings from JSON to actual Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Leaf,
  Lightbulb,
  Thermometer,
  Shield,
  Zap,
  Blinds,
  Speaker,
  Mic,
  Wifi,
  Bot,
  Calculator,
  LayoutDashboard,
  Smartphone,
};

export default function CompanyProfile() {
  const { language, isRTL } = useLanguage();
  const langKey = language === 'ar' ? 'ar' : 'en';
  const [downloading, setDownloading] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleDownloadPdf = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = profileData.brand.pdf;
    link.download = 'Azka-Smart-Company-Profile.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <Helmet>
        <title>
          {langKey === 'ar'
            ? 'الملف التعريفي للشركة | أزكا سمارت - حلول المنازل الذكية والذكاء الاصطناعي (مصر، السعودية، دبي)'
            : 'Company Profile | Azka Smart - Middle East Smart Home AI Solutions'}
        </title>
        <meta
          name="description"
          content={
            langKey === 'ar'
              ? 'الملف التعريفي الرسمي لشركة أزكا سمارت: المقرات في القاهرة والرياض ودبي. حلول متكاملة للمنازل والمباني الذكية مدعومة بالذكاء الاصطناعي. حمّل بروشور الشركة الرسمي بصيغة PDF.'
              : 'Official company profile of Azka Smart: Offices in Cairo, Riyadh, and Dubai. Enterprise AI orchestration and smart home automation engineered for the Middle East. Download printable PDF brochure.'
          }
        />
        <meta property="og:title" content="Azka Smart - Corporate Profile & Brochure" />
        <meta
          property="og:description"
          content="Intelligent Living, Engineered for the Middle East. Offices in Egypt, Saudi Arabia, and UAE."
        />
        <meta property="og:image" content="/company-profile/hero.jpg" />
      </Helmet>

      <div className="cp-root min-h-screen">
        {/* ==============================================================
            1. HERO SECTION
           ============================================================== */}
        <section className="cp-hero">
          <img
            src={profileData.images.hero}
            alt="Azka Smart luxury architecture"
            className="cp-hero-img"
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10 w-full">
            <div className="max-w-3xl">
              <span className="cp-eyebrow mb-4">
                {langKey === 'ar' ? 'الملف التعريفي الرسمي للشركة' : 'Official Corporate Profile'}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                <span className="text-white">{profileData.brand.name[langKey]}</span>
                <span className="block cp-gold-text mt-2 text-2xl sm:text-3xl lg:text-4xl font-light">
                  {profileData.brand.tagline[langKey]}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#cbd5e1] leading-relaxed mb-8 max-w-2xl">
                {profileData.brand.intro[langKey]}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="cp-btn cp-btn-gold group"
                  aria-label="Download PDF Company Profile"
                >
                  <Download className={`h-4 w-4 ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5 transition-transform'}`} />
                  <span>
                    {downloading
                      ? (langKey === 'ar' ? 'جارٍ التحميل...' : 'Downloading...')
                      : (langKey === 'ar' ? 'تحميل البروشور (PDF)' : 'Download PDF Profile')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="cp-btn cp-btn-ghost"
                  aria-label="Print or Save as PDF"
                >
                  <Printer className="h-4 w-4" />
                  <span>{langKey === 'ar' ? 'طباعة البروشور' : 'Print Brochure'}</span>
                </button>

                <Link
                  to="/ai-consultant"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#2dd4bf] hover:text-[#d4af6a] transition-colors px-2 py-3"
                >
                  <span>{langKey === 'ar' ? 'استشارة الذكاء الاصطناعي الفورية' : 'Explore AI Consultant'}</span>
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>

              {/* Regional Office Badges */}
              <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold tracking-wider text-[#9aa8bf] uppercase">
                  {langKey === 'ar' ? 'المقرات الإقليمية:' : 'Regional Hubs:'}
                </span>
                {profileData.offices.map((off) => (
                  <span key={off.id} className="cp-chip text-xs">
                    <Building2 className="h-3.5 w-3.5 text-[#d4af6a]" />
                    <span className="text-[#e8edf5] font-medium">{off.city[langKey]}, {off.country[langKey]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            2. KEY PERFORMANCE STATS BAR
           ============================================================== */}
        <section className="cp-stats py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {profileData.stats.map((stat, i) => (
                <div key={i} className="p-4">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2dd4bf] tracking-tight mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-medium uppercase tracking-wider text-[#cbd5e1]">
                    {stat.label[langKey]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            3. MISSION, VISION & CORE VALUES
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="cp-eyebrow justify-center mb-3">
                {langKey === 'ar' ? 'فلسفتنا وغايتنا' : 'Purpose & Philosophy'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'هندسة الجيل الجديد من المعيشة الذكية' : 'Architecting Tomorrow’s Living Spaces'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base">
                {langKey === 'ar'
                  ? 'رؤية طموحة ترتكز على مبادئ هندسية صارمة وتطويع الذكاء الاصطناعي لخدمة الإنسان وراحته وأمانه.'
                  : 'Rooted in engineering rigor, regional climate understanding, and effortless everyday intelligence.'}
              </p>
            </div>

            {/* Mission & Vision Dual Cards */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="cp-card p-8 sm:p-10 border-t-2 border-t-[#d4af6a]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="cp-icon">
                    <Compass className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold cp-gold-text">
                    {langKey === 'ar' ? 'رسالتنا' : 'Our Mission'}
                  </h3>
                </div>
                <p className="text-base sm:text-lg text-[#e8edf5] leading-relaxed">
                  {profileData.mission[langKey]}
                </p>
              </div>

              <div className="cp-card p-8 sm:p-10 border-t-2 border-t-[#2dd4bf]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="cp-icon">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#2dd4bf]">
                    {langKey === 'ar' ? 'رؤيتنا' : 'Our Vision'}
                  </h3>
                </div>
                <p className="text-base sm:text-lg text-[#e8edf5] leading-relaxed">
                  {profileData.vision[langKey]}
                </p>
              </div>
            </div>

            {/* 4 Operating Values */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {profileData.values.map((v, i) => {
                const IconComponent = iconMap[v.icon] || Sparkles;
                return (
                  <div key={i} className="cp-card p-6">
                    <div className="cp-icon mb-4">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">{v.title[langKey]}</h4>
                    <p className="text-sm text-[#9aa8bf] leading-relaxed">{v.desc[langKey]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==============================================================
            4. SOLUTIONS & TECHNOLOGY ECOSYSTEM
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-14 gap-6">
              <div className="max-w-2xl">
                <span className="cp-eyebrow mb-3">
                  {langKey === 'ar' ? 'منظومة الحلول المتكاملة' : 'Integrated Solutions'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {langKey === 'ar' ? 'حلول ذكية شاملة تحت سقف واحد' : 'Engineered Systems for Every Living Space'}
                </h2>
                <p className="text-[#9aa8bf] text-sm sm:text-base">
                  {langKey === 'ar'
                    ? 'من الإضاءة والتحكم الحراري إلى أعلى بروتوكولات الأمان العالمية والتحكم الصوتي، كل الأنظمة تتناغم في تجربة متكاملة.'
                    : 'From circadian lighting and HVAC zoning to enterprise-grade security and voice AI, harmonized in one cohesive ecosystem.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-[#d4af6a] font-semibold">
                  40+ Global Protocols:
                </span>
                <span className="text-xs text-[#cbd5e1] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  Matter • Zigbee 3.0 • KNX • Apple HomeKit
                </span>
              </div>
            </div>

            {/* Solutions Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
              {profileData.solutions.map((sol, i) => {
                const IconComponent = iconMap[sol.icon] || Lightbulb;
                return (
                  <div key={i} className="cp-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="cp-icon mb-4">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">{sol.title[langKey]}</h4>
                      <p className="text-sm text-[#9aa8bf] leading-relaxed">{sol.desc[langKey]}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#2dd4bf]">
                      <span>{langKey === 'ar' ? 'معتمد هندسياً' : 'Engineered Standard'}</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Showcase Hardware Banner */}
            <div className="cp-media rounded-2xl overflow-hidden relative">
              <img
                src={profileData.images.products}
                alt="Azka Smart luxury devices"
                className="w-full h-80 sm:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-[#050d1a]/50 to-transparent flex items-end p-8 sm:p-12">
                <div className="max-w-2xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2dd4bf] block mb-2">
                    {langKey === 'ar' ? 'أجهزة فاخرة ومعتمدة' : 'Certified Premium Hardware'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    {langKey === 'ar'
                      ? 'مختارة بعناية لأعلى معايير المتانة والتصميم'
                      : 'Curated for Aesthetics, Extreme Reliability & Longevity'}
                  </h3>
                  <p className="text-sm text-[#cbd5e1] mb-4">
                    {langKey === 'ar'
                      ? 'شاشات لمس بمحيط ذهبي ناعم، أقفال ذكية ببصمة ثلاثية الأبعاد، وحساسات بيئية دقيقة متوافقة مع درجات حرارة الشرق الأوسط.'
                      : 'Brushed gold metallic touch panels, 3D biometric locks, precision climate dials, and low-voltage lighting control.'}
                  </p>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#d4af6a] hover:text-white transition-colors"
                  >
                    <span>{langKey === 'ar' ? 'تصفح كتالوج المنتجات' : 'Browse Product Catalog'}</span>
                    <ArrowIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            5. PROPRIETARY AI PLATFORM & UNIFIED APP
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Platform Pillars */}
              <div className="lg:col-span-7">
                <span className="cp-eyebrow mb-3">
                  {langKey === 'ar' ? 'الميزة التنافسية' : 'The AI Advantage'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                  {langKey === 'ar'
                    ? 'منصة ذكاء اصطناعي تحوّل التخطيط إلى دقائق معدودة'
                    : 'Algorithmic Planning Meets Effortless Daily Control'}
                </h2>
                <p className="text-[#9aa8bf] text-base leading-relaxed mb-8">
                  {langKey === 'ar'
                    ? 'ودّع التخمين والتعقيد. تجمع منصتنا بين محرك ذكاء اصطناعي يحلل مخطط منزلك واحتياجاتك ليخرج بمقايسة دقيقة وواضحة، مع تطبيق موحد يجمع أجهزتك في تجربة سلسة.'
                    : 'We replace outdated integrator guesswork with transparent, software-driven tools: instant room-by-room calculations, automated system planning, and a single bilingual mobile app.'}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {profileData.platform.map((item, i) => {
                    const IconComponent = iconMap[item.icon] || Bot;
                    return (
                      <div key={i} className="cp-card p-5">
                        <div className="cp-icon mb-3">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">{item.title[langKey]}</h4>
                        <p className="text-xs text-[#9aa8bf] leading-relaxed">{item.desc[langKey]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: App UI Showcase */}
              <div className="lg:col-span-5">
                <div className="cp-media rounded-3xl overflow-hidden border-2 border-[#d4af6a]/40 shadow-2xl">
                  <img
                    src={profileData.images.appUi}
                    alt="Azka Smart Mobile App"
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-6 bg-[#08162b] border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {langKey === 'ar' ? 'تطبيق أزكا سمارت ثنائي اللغة' : 'Azka Smart Unified App'}
                        </div>
                        <div className="text-xs text-[#9aa8bf]">
                          {langKey === 'ar' ? 'متاح لأنظمة iOS و Android' : 'Available on iOS & Android'}
                        </div>
                      </div>
                      <Link
                        to="/app-simulator"
                        className="cp-btn cp-btn-ghost text-xs !h-9 !px-4"
                      >
                        {langKey === 'ar' ? 'جرّب المحاكي' : 'Try Simulator'}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            6. REGIONAL PRESENCE: CAIRO, RIYADH, DUBAI
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="cp-eyebrow justify-center mb-3">
                {langKey === 'ar' ? 'تواجدنا في الشرق الأوسط' : 'Regional Infrastructure'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'مكاتب إقليمية ومراكز تجربة حية' : 'Three Hubs. One Certified Standard.'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base">
                {langKey === 'ar'
                  ? 'نعمل مباشرة عبر مقراتنا في مصر والمملكة العربية السعودية والإمارات لضمان سلاسل إمداد سريعة وفرق تركيب محلية معتمدة.'
                  : 'Direct local presence, centralized warehousing, and regional engineering teams delivering across the Middle East.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {profileData.offices.map((office) => (
                <div key={office.id} className="cp-card overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={office.image}
                        alt={`${office.city[langKey]} office`}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute top-4 start-4 bg-[#050d1a]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-[#d4af6a]">
                        {office.country[langKey]}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{office.role[langKey]}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {office.city[langKey]}
                      </h3>
                      <p className="text-sm text-[#9aa8bf] leading-relaxed mb-6">
                        {office.desc[langKey]}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-white/5 mt-auto">
                    <div className="space-y-2 text-xs text-[#cbd5e1]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[#d4af6a]" />
                        <span>{office.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[#d4af6a]" />
                        <span dir="ltr">{office.phone || profileData.brand.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            7. PROVEN 4-PHASE DELIVERY PROCESS
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="cp-eyebrow justify-center mb-3">
                {langKey === 'ar' ? 'منهجية التنفيذ' : 'Execution Methodology'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'مراحل تسليم المشاريع المعتمدة' : 'Four Steps from Concept to Commissioning'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base">
                {langKey === 'ar'
                  ? 'عملية هندسية محكمة تضمن جودة التركيب والالتزام بالجدول الزمني وضمان مستمر.'
                  : 'A transparent, milestone-driven framework that guarantees zero downtime and lifetime reliability.'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {profileData.process.map((pr, idx) => (
                <div key={idx} className="cp-card p-6 relative">
                  <div className="cp-step-num mb-4">0{idx + 1}</div>
                  <h4 className="text-xl font-bold text-white mb-2">{pr.title[langKey]}</h4>
                  <p className="text-sm text-[#9aa8bf] leading-relaxed">{pr.desc[langKey]}</p>
                </div>
              ))}
            </div>

            {/* Target Sectors Grid */}
            <div className="mt-16 pt-12 border-t border-white/10">
              <div className="text-center mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-[#d4af6a]">
                  {langKey === 'ar' ? 'القطاعات المستهدفة' : 'Market Sectors'}
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {langKey === 'ar' ? 'خبرة معتمدة في كافة أنواع المشاريع' : 'Engineered for Scale Across Distinct Verticals'}
                </h3>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {profileData.sectors.map((sec, i) => (
                  <span
                    key={i}
                    className="px-5 py-2.5 rounded-full bg-[#0d2140] border border-[#d4af6a]/30 text-sm font-medium text-[#e8edf5] hover:border-[#2dd4bf] transition-colors"
                  >
                    {sec[langKey]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            8. INSTALLATION & TEAM GALLERY SHOWCASE
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="cp-media rounded-2xl relative h-80 sm:h-96">
                <img
                  src={profileData.images.installation}
                  alt="Certified Installation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent to-transparent flex items-end p-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#2dd4bf] block mb-1">
                      {langKey === 'ar' ? 'الجودة والدقة' : 'Field Engineering'}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {langKey === 'ar' ? 'تركيب احترافي بكابلات وتجهيزات مخفية' : 'Precision Installations & Neat Infrastructure'}
                    </h3>
                    <p className="text-xs text-[#cbd5e1]">
                      {langKey === 'ar'
                        ? 'فنيون معتمدون يتبعون أشد المعايير الصارمة للجهد الكهربائي ودرجات الحرارة.'
                        : 'Certified technicians adhering strictly to regional electrical codes and thermal safeguards.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="cp-media rounded-2xl relative h-80 sm:h-96">
                <img
                  src={profileData.images.team}
                  alt="Azka Smart Team"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent to-transparent flex items-end p-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#d4af6a] block mb-1">
                      {langKey === 'ar' ? 'فريقنا الإقليمي' : 'Regional Specialists'}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {langKey === 'ar' ? 'دعم مستمر ومتابعة وتشغيل على مدار الساعة' : 'Dedicated Support & Lifetime Commissioning'}
                    </h3>
                    <p className="text-xs text-[#cbd5e1]">
                      {langKey === 'ar'
                        ? 'مهندسو نظم ومستشارو ذكاء اصطناعي وفريق خدمة عملاء ثنائي اللغة.'
                        : 'Systems engineers, AI platform architects, and responsive bilingual customer support.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            9. CALL TO ACTION & PDF DOWNLOAD BANNER
           ============================================================== */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#08162b] to-[#050d1a]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="cp-card p-10 sm:p-14 lg:p-16 text-center max-w-4xl mx-auto border-2 border-[#d4af6a]/50 shadow-2xl">
              <span className="cp-eyebrow justify-center mb-4">
                {langKey === 'ar' ? 'ابدأ مشروعك اليوم' : 'Begin Your Transformation'}
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                {langKey === 'ar'
                  ? 'جاهز لتحويل منزلك أو مشروعك إلى مساحة ذكية متكاملة؟'
                  : 'Ready to Experience True Intelligent Living?'}
              </h2>

              <p className="text-[#cbd5e1] text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                {langKey === 'ar'
                  ? 'احصل على نسخة رقمية عالية الدقة من الملف التعريفي، أو تواصل مباشرة مع فريقنا الهندسي لحجز معاينة موقع واستشارة مخصصة.'
                  : 'Download our comprehensive executive brochure or speak directly with our engineering consultants to schedule a site survey in Egypt, Saudi Arabia, or Dubai.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="cp-btn cp-btn-gold text-base"
                >
                  <FileText className="h-5 w-5" />
                  <span>
                    {downloading
                      ? (langKey === 'ar' ? 'جارٍ التحميل...' : 'Downloading PDF...')
                      : (langKey === 'ar' ? 'تحميل البروشور الكامل (PDF)' : 'Download Full PDF Brochure')}
                  </span>
                </button>

                <Link
                  to="/ai-consultant"
                  className="cp-btn cp-btn-ghost text-base"
                >
                  <Bot className="h-5 w-5 text-[#2dd4bf]" />
                  <span>{langKey === 'ar' ? 'بدء استشارة الذكاء الاصطناعي' : 'Launch AI Consultant'}</span>
                </Link>
              </div>

              {/* Direct Contacts Bar */}
              <div className="mt-12 pt-8 border-t border-white/10 grid sm:grid-cols-3 gap-6 text-xs text-[#9aa8bf]">
                <div>
                  <div className="font-semibold text-white mb-1">{langKey === 'ar' ? 'البريد الإلكتروني المباشر' : 'Direct Email'}</div>
                  <a href={`mailto:${profileData.brand.email}`} className="text-[#d4af6a] hover:underline">
                    {profileData.brand.email}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">{langKey === 'ar' ? 'الهاتف الرئيسي' : 'Direct Phone'}</div>
                  <a href={`tel:${profileData.brand.phone}`} className="text-[#2dd4bf] hover:underline" dir="ltr">
                    {profileData.brand.phone}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">{langKey === 'ar' ? 'المنصة الرسمية' : 'Official Portal'}</div>
                  <span className="text-[#cbd5e1]">{profileData.brand.website}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
