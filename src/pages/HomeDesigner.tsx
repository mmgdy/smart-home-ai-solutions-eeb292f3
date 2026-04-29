import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { HomePhotoDesigner } from '@/components/home/HomePhotoDesigner';

const HomeDesignerPage = () => (
  <>
    <Helmet>
      <title>AI Home Designer | Baytzaki</title>
      <meta name="description" content="Upload a photo of any room and AI will show exactly where to place every smart device. Instant smart home planning." />
    </Helmet>
    <Layout>
      <div className="pt-16">
        <HomePhotoDesigner />
      </div>
    </Layout>
  </>
);

export default HomeDesignerPage;
