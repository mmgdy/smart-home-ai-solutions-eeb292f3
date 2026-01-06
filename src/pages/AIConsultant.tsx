import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const AIConsultant = () => {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('aiConsultant')} | Baytzaki</title>
        <meta
          name="description"
          content="Get personalized smart home recommendations from our AI consultant. Describe your needs and get a custom solution package."
        />
      </Helmet>
      <Layout>
        <div className="container py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              {t('comingSoon')}
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground">
              {t('aiConsultantPageTitle')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('aiConsultantPageDesc')}
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default AIConsultant;
