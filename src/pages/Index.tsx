import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { BrandShowcase } from '@/components/home/BrandShowcase';
import { AIConsultantCTA } from '@/components/home/AIConsultantCTA';
import { TrySmartLighting } from '@/components/home/TrySmartLighting';
import { TryMovieMode } from '@/components/home/TryMovieMode';
import { TryCurtainControl } from '@/components/home/TryCurtainControl';
import { TryClimateControl } from '@/components/home/TryClimateControl';
import { TrySecuritySystem } from '@/components/home/TrySecuritySystem';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Baytzaki - Smart Home Products & AI Solutions</title>
        <meta
          name="description"
          content="Transform your home with Baytzaki's premium smart home products. Get AI-powered recommendations for lighting, security, climate control, and more."
        />
      </Helmet>
      <Layout>
        <HeroSection />
        <WhyChooseUs />
        <TrySmartLighting />
        <TryMovieMode />
        <TryCurtainControl />
        <TryClimateControl />
        <TrySecuritySystem />
        <FeaturedProducts />
        <BrandShowcase />
        <AIConsultantCTA />
      </Layout>
    </>
  );
};

export default Index;
