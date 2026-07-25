import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { SolutionCategories } from '@/components/home/SolutionCategories';
import { AIAdvisorShowcase } from '@/components/home/AIAdvisorShowcase';
import { SmartBundles } from '@/components/home/SmartBundles';
import { TrustAndStats } from '@/components/home/TrustAndStats';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { BrandShowcase } from '@/components/home/BrandShowcase';
import { HomePhotoDesigner } from '@/components/home/HomePhotoDesigner';
import { ArtFurnitureShowcase } from '@/components/home/ArtFurnitureShowcase';
import { RFIDShowcase } from '@/components/home/RFIDShowcase';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Baytzaki - Build Your Smart Home in Minutes with AI | Egypt</title>
        <meta
          name="description"
          content="Egypt's 1st AI Smart Home Platform. Get personalized smart home plans, buy devices, and book professional installation. Cash on delivery. Official warranty."
        />
      </Helmet>
      <Layout>
        <HeroSection />
        <SolutionCategories />
        <AIAdvisorShowcase />
        <SmartBundles />
        <RFIDShowcase />
        <ArtFurnitureShowcase />
        <HomePhotoDesigner />
        <TrustAndStats />
        <FeaturedProducts />
        <BrandShowcase />
      </Layout>
    </>
  );
};

export default Index;
