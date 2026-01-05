import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Sparkles } from 'lucide-react';

const AIConsultant = () => {
  return (
    <>
      <Helmet>
        <title>AI Smart Home Consultant | Baytzaki</title>
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
              Coming Soon
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground">
              AI Smart Home Consultant
            </h1>
            <p className="text-lg text-muted-foreground">
              Our AI-powered consultant will help you build the perfect smart home setup. 
              Just describe your needs and get personalized product recommendations.
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default AIConsultant;
