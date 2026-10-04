import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
  Thermometer,
  Zap,
  Radio,
  FileCode2,
  CheckCircle2,
  Building2,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  Award,
  Activity,
  Sliders,
  Gauge,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/lib/i18n';
import profileData from '@/data/companyProfile.json';
import './CompanyProfile.css';

export default function CompanyProfile() {
  const { language, isRTL } = useLanguage();
  const langKey = language === 'ar' ? 'ar' : 'en';
  const [downloading, setDownloading] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string>(profileData.architectureLayers[0].id);

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

  const selectedLayerData = profileData.architectureLayers.find((l) => l.id === activeLayer) || profileData.architectureLayers[0];

  return (
    <Layout>
      <Helmet>
        <title>
          {langKey === 'ar'
            ? 'الملف الفني والهندسي للشركة | أزكا سمارت - تكامل الأنظمة الذكية والذكاء الاصطناعي'
            : 'Engineering Profile & Technical Architecture | Azka Smart Solutions'}
        </title>
        <meta
          name="description"
          content={
            langKey === 'ar'
              ? 'الملف الفني والهندسي الرسمي لشركة أزكا سمارت: مواصفات طوبولوجيا النواقل السلكية واللاسلكية KNX و Matter و Modbus، معايير التوافق مع شبكات الكهرباء في مصر والسعودية والإمارات، ودراسات حالة واقعية.'
              : 'Official technical engineering profile of Azka Smart: Fieldbus topology (KNX, Matter, Modbus VRF), regional electrical compliance (Egypt, KSA, UAE), real-world residential case studies, and proprietary AI engineering pipelines.'
          }
        />
        <meta property="og:title" content="Azka Smart - Systems Engineering & Technical Architecture" />
        <meta
          property="og:description"
          content="Certified Low-Voltage & AI Automation Engineering. Operating across Cairo, Riyadh, and Dubai."
        />
        <meta property="og:image" content="/company-profile/hero.jpg" />
      </Helmet>

      <div className="cp-root min-h-screen">
        {/* ==============================================================
            1. HERO SECTION: ENGINEERING FIRST
           ============================================================== */}
        <section className="cp-hero">
          <img
            src={profileData.images.hero}
            alt="Azka Smart architectural engineering"
            className="cp-hero-img"
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10 w-full">
            <div className="max-w-4xl">
              <span className="cp-eyebrow mb-4">
                {langKey === 'ar' ? 'الملف الفني والهندسي المعتمد' : 'Certified Systems Engineering Profile'}
              </span>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight text-white">
                <span>{profileData.brand.name[langKey]}</span>
                <span className="block cp-gold-text mt-2 text-xl sm:text-2xl lg:text-3xl font-normal">
                  {profileData.brand.tagline[langKey]}
                </span>
              </h1>

              <div className="inline-block mb-6 px-4 py-2 rounded-lg bg-[#0d2140]/80 border border-[#2dd4bf]/40 text-xs sm:text-sm font-mono text-[#2dd4bf]">
                {profileData.brand.subheading[langKey]}
              </div>

              <p className="text-base sm:text-lg text-[#cbd5e1] leading-relaxed mb-8 max-w-3xl">
                {profileData.brand.intro[langKey]}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="cp-btn cp-btn-gold group"
                  aria-label="Download Technical Specification PDF"
                >
                  <Download className={`h-4 w-4 ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5 transition-transform'}`} />
                  <span>
                    {downloading
                      ? (langKey === 'ar' ? 'جارٍ التحميل...' : 'Downloading PDF...')
                      : (langKey === 'ar' ? 'تحميل الكتيب الفني (PDF)' : 'Download Technical PDF')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="cp-btn cp-btn-ghost"
                  aria-label="Print or Save as PDF"
                >
                  <Printer className="h-4 w-4" />
                  <span>{langKey === 'ar' ? 'طباعة المستند' : 'Print Whitepaper'}</span>
                </button>

                <Link
                  to="/calculator"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#2dd4bf] hover:text-[#d4af6a] transition-colors px-2 py-3"
                >
                  <span>{langKey === 'ar' ? 'حاسبة الأحمال والمقايسة الفورية' : 'Instant BOQ & Load Calculator'}</span>
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>

              {/* Certification Chips */}
              <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono text-[#9aa8bf] uppercase">
                  {langKey === 'ar' ? 'الاعتمادات الهندسية:' : 'Accreditations:'}
                </span>
                {profileData.certifications.map((c, i) => (
                  <div key={i} className="cp-badge-cert" title={c.desc[langKey]}>
                    <ShieldCheck className="h-3.5 w-3.5 text-[#2dd4bf]" />
                    <span className="font-mono text-xs font-bold text-[#e8edf5]">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            2. HARDWARE & FIELD BUS BENCHMARKS (REAL KPIS)
           ============================================================== */}
        <section className="cp-stats py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {profileData.stats.map((stat, i) => (
                <div key={i} className="p-4 border-r last:border-r-0 border-white/10">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-[#2dd4bf] tracking-tight mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#cbd5e1]">
                    {stat.label[langKey]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            3. SYSTEM ARCHITECTURE & BUS TOPOLOGY EXPLORER
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="cp-eyebrow mb-3">
                {langKey === 'ar' ? 'الطوبولوجيا والبنية التحتية' : 'System Architecture'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'بنية تحتية هندسية متعددة الطبقات' : 'Four-Tier Industrial Fieldbus Topology'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base leading-relaxed">
                {langKey === 'ar'
                  ? 'لا نعتمد على الأدوات الاستهلاكية السحابية الهشة. صممت بنيتنا لتعمل باستقلالية تامة على لوحات التوزيع المحلية مع عزل كامل بين شبكات التحكم والمستخدم.'
                  : 'Unlike fragile consumer cloud smart hubs, our architecture operates with zero external cloud dependencies for mission-critical lighting, HVAC, and access control.'}
              </p>
            </div>

            {/* Interactive Architecture Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {profileData.architectureLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`cp-tab-btn ${activeLayer === layer.id ? 'active' : ''}`}
                >
                  <Layers className="h-4 w-4" />
                  <span>{layer.layer[langKey]}</span>
                </button>
              ))}
            </div>

            {/* Active Layer Deep Dive Card */}
            <div className="cp-card p-8 sm:p-10 border-t-2 border-t-[#2dd4bf]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-white/10">
                <div>
                  <span className="cp-code-chip mb-2 inline-block">
                    {selectedLayerData.tech}
                  </span>
                  <h3 className="text-2xl font-bold text-white">
                    {selectedLayerData.layer[langKey]}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#d4af6a] bg-black/40 px-3 py-1.5 rounded border border-[#d4af6a]/30">
                  <Activity className="h-3.5 w-3.5 text-[#2dd4bf]" />
                  <span>ISO/IEC & IEEE Compliant</span>
                </div>
              </div>

              <p className="text-base text-[#e8edf5] leading-relaxed mb-8 max-w-3xl">
                {selectedLayerData.desc[langKey]}
              </p>

              {/* Technical Specifications Grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                {selectedLayerData.specs.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#050d1a]/80 border border-white/10">
                    <div className="text-xs uppercase tracking-wider text-[#9aa8bf] font-semibold mb-1">
                      {s.k}
                    </div>
                    <div className="text-sm font-mono font-bold text-[#2dd4bf]">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            4. REGIONAL ELECTRICAL & GRID COMPLIANCE MATRIX
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="cp-eyebrow mb-3">
                {langKey === 'ar' ? 'التوافق الكهربائي الإقليمي' : 'Regional Grid Engineering'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'معايير الكهرباء وشبكات التوزيع في الشرق الأوسط' : 'Engineered for Middle Eastern Power Grids'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base leading-relaxed">
                {langKey === 'ar'
                  ? 'فوارق التردد (50Hz مقابل 60Hz)، غياب خط المحايد في العلب القديمة، ودرجات حرارة الصيف التي تتجاوز 50 درجة مئوية تتطلب معالجة هندسية متخصصة لكل بلد.'
                  : 'Frequency discrepancies (50Hz vs 60Hz SASO), legacy switch backboxes without neutral conductors, and severe summer ambient thermals require strict localized engineering.'}
              </p>
            </div>

            {/* Compliance Table */}
            <div className="overflow-x-auto">
              <table className="cp-spec-table">
                <thead>
                  <tr>
                    <th>{langKey === 'ar' ? 'الدولة والشبكة' : 'Jurisdiction & Grid'}</th>
                    <th>{langKey === 'ar' ? 'كود الكهرباء والمواصفات' : 'Electrical Standards'}</th>
                    <th>{langKey === 'ar' ? 'استراتيجية خط المحايد (Neutral)' : 'Neutral Wire Architecture'}</th>
                    <th>{langKey === 'ar' ? 'معايير العزل والحرارة' : 'Thermal & Environmental Mitigations'}</th>
                  </tr>
                </thead>
                <tbody>
                  {profileData.regionalCompliance.map((rc, i) => (
                    <tr key={i}>
                      <td>
                        <div className="font-bold text-white text-base mb-1">{rc.country[langKey]}</div>
                        <span className="cp-code-chip">{rc.grid}</span>
                      </td>
                      <td>
                        <span className="text-[#d4af6a] font-medium">{rc.standards}</span>
                      </td>
                      <td className="text-sm text-[#cbd5e1] max-w-xs">
                        {rc.neutralStrategy}
                      </td>
                      <td className="text-sm text-[#9aa8bf] max-w-xs">
                        {rc.thermalFocus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ==============================================================
            5. REAL-WORLD REFERENCE CASE STUDIES
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <span className="cp-eyebrow mb-3">
                {langKey === 'ar' ? 'المشاريع المنفذة' : 'Field Reference Projects'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'دراسات حالة واقعية ومقايسات هندسية' : 'Real-World Technical Deployments'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base leading-relaxed">
                {langKey === 'ar'
                  ? 'نظرة تفصيلية على مشاريع حقيقية تم تسليمها في القاهرة والرياض ودبي مع مقايسات الدوائر، نسبة خفض استهلاك الطاقة، وزمن الاستجابة.'
                  : 'Granular project breakdown: circuit counts, HVAC gateways, energy reductions, and bus response latencies measured post-commissioning.'}
              </p>
            </div>

            <div className="space-y-8">
              {profileData.caseStudies.map((cs) => (
                <div key={cs.id} className="cp-card p-6 sm:p-8 border border-white/10">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#2dd4bf] mb-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{cs.location[langKey]}</span>
                        <span className="text-white/30">•</span>
                        <span>{cs.type[langKey]}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">
                        {cs.title[langKey]}
                      </h3>
                    </div>

                    <span className="cp-code-chip text-xs self-start lg:self-center">
                      Verified Case Study
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-[#cbd5e1] leading-relaxed mb-6">
                    {cs.scope[langKey]}
                  </p>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                    {cs.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="p-3 rounded-lg bg-[#050d1a] border border-white/5">
                        <div className="text-xs text-[#9aa8bf] mb-1">
                          {m.label[langKey]}
                        </div>
                        <div className="text-base font-bold font-mono text-[#d4af6a]">
                          {m.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            6. PROPRIETARY AI ENGINEERING PIPELINE
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="cp-eyebrow mb-3">
                  {langKey === 'ar' ? 'محرك الذكاء الاصطناعي الخاص' : 'Proprietary AI Pipeline'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                  {profileData.aiEngine.title[langKey]}
                </h2>
                <p className="text-[#9aa8bf] text-base leading-relaxed mb-8">
                  {profileData.aiEngine.description[langKey]}
                </p>

                <div className="space-y-4">
                  {profileData.aiEngine.features.map((feat, i) => (
                    <div key={i} className="cp-card p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="h-4 w-4 text-[#2dd4bf]" />
                        <h4 className="text-base font-bold text-white">
                          {feat.name[langKey]}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                        {feat.detail[langKey]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardware & App Integration Preview */}
              <div className="lg:col-span-5 space-y-6">
                <div className="cp-media rounded-2xl overflow-hidden border border-[#d4af6a]/30 shadow-xl">
                  <img
                    src={profileData.images.products}
                    alt="Engineered hardware"
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4 bg-[#08162b] border-t border-white/10 text-xs">
                    <span className="text-[#d4af6a] font-bold block mb-1">
                      {langKey === 'ar' ? 'معدات صناعية معتمدة' : 'Industrial Hardware Tier'}
                    </span>
                    <span className="text-[#9aa8bf]">
                      ABB & Schneider DIN-rail modular actuators, solid brass touch keypads, and industrial Modbus gateways.
                    </span>
                  </div>
                </div>

                <div className="cp-media rounded-2xl overflow-hidden border border-[#2dd4bf]/30 shadow-xl">
                  <img
                    src={profileData.images.appUi}
                    alt="Unified local mobile app"
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4 bg-[#08162b] border-t border-white/10 text-xs">
                    <span className="text-[#2dd4bf] font-bold block mb-1">
                      {langKey === 'ar' ? 'تطبيق موحد محلي الاتصال' : 'Local-First Unified Application'}
                    </span>
                    <span className="text-[#9aa8bf]">
                      Sub-30ms switch execution via local WebSockets with automatic fallback to encrypted remote WireGuard.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            7. CERTIFIED 4-PHASE ENGINEERING LIFECYCLE
           ============================================================== */}
        <section className="cp-section">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <span className="cp-eyebrow mb-3">
                {langKey === 'ar' ? 'دورة حياة المشروع الهندسية' : 'Engineering Workflow'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'من قراءة المخطط إلى التشغيل والتسليم' : 'Four Milestones from DWG to Full Commissioning'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base leading-relaxed">
                {langKey === 'ar'
                  ? 'بروتوكول هندسي دقيق يبدأ بفحص الأحمال وتيار البدء في لوحات التوزيع وينتهي بتسليم كابينة تحكم مجهزة بضمان شامل.'
                  : 'Zero shortcuts: exhaustive electrical load audits, in-workshop pre-wiring, and on-site local bus commissioning with full SLD documentation.'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {profileData.process.map((pr, idx) => (
                <div key={idx} className="cp-card p-6 relative">
                  <div className="cp-step-num mb-4">{pr.step}</div>
                  <h4 className="text-lg font-bold text-white mb-2">{pr.title[langKey]}</h4>
                  <p className="text-xs sm:text-sm text-[#9aa8bf] leading-relaxed">{pr.desc[langKey]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            8. REGIONAL HUBS & PHYSICAL OFFICES
           ============================================================== */}
        <section className="cp-section cp-section-alt">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <span className="cp-eyebrow mb-3">
                {langKey === 'ar' ? 'المقرات الإقليمية المباشرة' : 'Direct Regional Presence'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {langKey === 'ar' ? 'ثلاثة مكاتب وورش تجميع هندسية في المنطقة' : 'Local Engineering Bureaus in Cairo, Riyadh & Dubai'}
              </h2>
              <p className="text-[#9aa8bf] text-sm sm:text-base leading-relaxed">
                {langKey === 'ar'
                  ? 'نوفر فرق عمل محلية دائمة وورش تجميع لوحات معتمدة ومستودعات مركزية لضمان سرعة التوريد وتوفر قطع الغيار الأصلية.'
                  : 'Physical engineering offices, panel assembly workshops, and central warehouses ensuring immediate spare parts and localized field engineers.'}
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
                      <div className="absolute top-4 start-4 bg-[#050d1a]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono font-semibold text-[#d4af6a]">
                        {office.country[langKey]}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#2dd4bf] mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{office.role[langKey]}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {office.city[langKey]}
                      </h3>
                      <div className="text-xs text-[#d4af6a] font-medium mb-3">
                        {office.address[langKey]}
                      </div>
                      <p className="text-xs sm:text-sm text-[#9aa8bf] leading-relaxed mb-6">
                        {office.desc[langKey]}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-white/5 mt-auto">
                    <div className="space-y-2 text-xs font-mono text-[#cbd5e1]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[#d4af6a]" />
                        <span>{office.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[#2dd4bf]" />
                        <span dir="ltr">{office.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==============================================================
            9. CALL TO ACTION & WHITE-PAPER DOWNLOAD
           ============================================================== */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#08162b] to-[#050d1a]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="cp-card p-10 sm:p-14 lg:p-16 text-center max-w-4xl mx-auto border-2 border-[#d4af6a]/50 shadow-2xl">
              <span className="cp-eyebrow justify-center mb-4">
                {langKey === 'ar' ? 'التواصل الهندسي المباشر' : 'Engineering Engagement'}
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                {langKey === 'ar'
                  ? 'هل لديك مخطط معماري أو مشروع ترغب في دراسته؟'
                  : 'Have an Architectural Blueprint or Project in Design?'}
              </h2>

              <p className="text-[#cbd5e1] text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                {langKey === 'ar'
                  ? 'أرسل مخططات CAD أو PDF إلى فريقنا الهندسي للحصول على دراسة أحمال مفصلة، مخطط أحادي (SLD)، وقائمة كميات مسعرة بالكامل.'
                  : 'Submit your CAD or PDF blueprints for an automated electrical load breakdown, single-line diagram (SLD), and line-item BOQ generated by our AI engineering pipeline.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="cp-btn cp-btn-gold text-base"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    {downloading
                      ? (langKey === 'ar' ? 'جارٍ التحميل...' : 'Downloading...')
                      : (langKey === 'ar' ? 'تحميل الملف الفني الكامل (PDF)' : 'Download Technical Brochure (PDF)')}
                  </span>
                </button>

                <Link
                  to="/calculator"
                  className="cp-btn cp-btn-ghost text-base"
                >
                  <FileSpreadsheet className="h-5 w-5 text-[#2dd4bf]" />
                  <span>{langKey === 'ar' ? 'حاسبة التكلفة وقائمة الكميات' : 'Open BOQ Calculator'}</span>
                </Link>
              </div>

              {/* Direct Contacts Bar */}
              <div className="mt-12 pt-8 border-t border-white/10 grid sm:grid-cols-3 gap-6 text-xs text-[#9aa8bf]">
                <div>
                  <div className="font-semibold text-white mb-1 font-mono">{langKey === 'ar' ? 'بريد المكتب الهندسي' : 'Engineering Bureau'}</div>
                  <a href={`mailto:${profileData.brand.email}`} className="text-[#d4af6a] hover:underline font-mono">
                    {profileData.brand.email}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1 font-mono">{langKey === 'ar' ? 'الاتصال المباشر' : 'Direct Line'}</div>
                  <a href={`tel:${profileData.brand.phone}`} className="text-[#2dd4bf] hover:underline font-mono" dir="ltr">
                    {profileData.brand.phone}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1 font-mono">{langKey === 'ar' ? 'الموقع الإلكتروني' : 'Engineering Portal'}</div>
                  <span className="text-[#cbd5e1] font-mono">{profileData.brand.website}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
