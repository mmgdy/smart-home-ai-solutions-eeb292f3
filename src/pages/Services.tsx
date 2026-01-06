import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Wrench, Settings, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

const Services = () => {
  const { t, formatPrice } = useLanguage();

  const services = [
    {
      icon: Settings,
      titleKey: 'smartHomeInstallation' as const,
      descKey: 'smartHomeInstallationDesc' as const,
      price: 500,
    },
    {
      icon: Wrench,
      titleKey: 'systemConfiguration' as const,
      descKey: 'systemConfigurationDesc' as const,
      price: 750,
    },
    {
      icon: Phone,
      titleKey: 'consultation' as const,
      descKey: 'consultationDesc' as const,
      price: 250,
    },
  ];

  return (
    <>
      <Helmet>
        <title>{t('services')} | Baytzaki</title>
        <meta
          name="description"
          content="Professional smart home installation and consultation services. Expert setup for all your smart home devices."
        />
      </Helmet>
      <Layout>
        <div className="container py-12">
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground">
              {t('ourServices')}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t('servicesDesc')}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.titleKey}
                className="group rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                  {t(service.titleKey)}
                </h3>
                <p className="mb-6 text-muted-foreground">{t(service.descKey)}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-primary">
                    {t('from')} {formatPrice(service.price)}
                  </span>
                  <Button variant="outline" size="sm">
                    {t('learnMore')}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-8 text-center md:p-12">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              {t('needCustomSolution')}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              {t('customSolutionDesc')}
            </p>
            <Button size="lg" className="glow-primary">
              {t('contactUs')}
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Services;
