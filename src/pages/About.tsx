import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Users, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const About = () => {
  const { isRTL } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'عن بيتزكي | قصة العلامة' : 'About Baytzaki | Our Story'}</title>
        <meta name="description" content="Baytzaki's mission is to make every Egyptian home smart, safe, and energy-efficient through AI-powered solutions." />
      </Helmet>
      <Layout>
        <div className="pt-24 pb-20">
          {/* Hero */}
          <div className="container px-6 md:px-12 max-w-4xl mx-auto text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl md:text-5xl font-bold mb-6"
            >
              {isRTL ? 'نحوّل كل بيت مصري لبيت ذكي' : 'Making Every Egyptian Home Smart'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground leading-relaxed"
            >
              {isRTL
                ? 'بيتزكي هي أول منصة مصرية تجمع بين الذكاء الاصطناعي ومنتجات المنزل الذكي وخدمات التركيب في مكان واحد. مهمتنا إن كل بيت مصري يبقى ذكي وموفر للطاقة وآمن.'
                : "Baytzaki is Egypt's first platform combining AI advisory, smart home products, and professional installation in one place. Our mission is to make every Egyptian home intelligent, energy-efficient, and secure."}
            </motion.p>
          </div>

          {/* Values */}
          <div className="container px-6 md:px-12 max-w-4xl mx-auto mb-16">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Sparkles,
                  titleEn: 'AI-First Approach',
                  titleAr: 'الذكاء الاصطناعي أولاً',
                  descEn: 'We use AI to eliminate the complexity of smart home planning. No technical knowledge needed.',
                  descAr: 'نستخدم الذكاء الاصطناعي لإزالة تعقيدات تخطيط المنزل الذكي. بدون خبرة تقنية.',
                },
                {
                  icon: Users,
                  titleEn: 'Egyptian Expertise',
                  titleAr: 'خبرة مصرية',
                  descEn: 'Products tested for Egyptian homes, voltage, and climate. Local technicians who understand your needs.',
                  descAr: 'منتجات مختبرة للمنازل المصرية والجهد الكهربائي والمناخ. فنيون محليون يفهمون احتياجاتك.',
                },
                {
                  icon: Heart,
                  titleEn: 'End-to-End Service',
                  titleAr: 'خدمة متكاملة',
                  descEn: 'From planning to purchase to installation to support. We handle everything so you enjoy your smart home.',
                  descAr: 'من التخطيط للشراء للتركيب للدعم. نتعامل مع كل شيء عشان تستمتع ببيتك الذكي.',
                },
              ].map((value, index) => (
                <motion.div
                  key={value.titleEn}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{isRTL ? value.titleAr : value.titleEn}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isRTL ? value.descAr : value.descEn}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Vision */}
          <div className="container px-6 md:px-12 max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 text-center"
            >
              <Zap className="h-8 w-8 text-primary mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold mb-3">
                {isRTL ? 'رؤيتنا' : 'Our Vision'}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {isRTL
                  ? 'نحلم بمصر كل بيت فيها ذكي وموفر للطاقة. نعتقد إن التكنولوجيا لازم تكون سهلة ومتاحة للجميع، مش بس للمتخصصين.'
                  : 'We dream of an Egypt where every home is smart and energy-efficient. We believe technology should be accessible and simple for everyone, not just tech experts.'}
              </p>
            </motion.div>
          </div>

          {/* CTA */}
          <div className="container px-6 md:px-12 text-center">
            <Link to="/ai-consultant">
              <Button size="lg" className="rounded-full h-14 px-8 glow-primary">
                {isRTL ? 'ابدأ رحلة المنزل الذكي' : 'Start Your Smart Home Journey'}
                <ArrowRight className={cn("ml-2 h-5 w-5", isRTL && "rotate-180 mr-2 ml-0")} />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default About;
