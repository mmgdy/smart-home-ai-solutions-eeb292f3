import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Wrench, Settings, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const services = [
  {
    icon: Settings,
    title: 'Smart Home Installation',
    description: 'Professional installation of all smart home devices. Our certified technicians ensure everything works perfectly.',
    price: 'From $99',
  },
  {
    icon: Wrench,
    title: 'System Configuration',
    description: 'Complete setup and configuration of your smart home ecosystem. Automations, scenes, and voice control setup included.',
    price: 'From $149',
  },
  {
    icon: Phone,
    title: 'Consultation',
    description: 'One-on-one consultation to plan your smart home journey. Get expert advice on products and setup.',
    price: 'From $49',
  },
];

const Services = () => {
  return (
    <>
      <Helmet>
        <title>Services | Baytzaki</title>
        <meta
          name="description"
          content="Professional smart home installation and consultation services. Expert setup for all your smart home devices."
        />
      </Helmet>
      <Layout>
        <div className="container py-12">
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground">
              Our Services
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              We offer professional installation and support services to help you get the most out of your smart home.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="mb-6 text-muted-foreground">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-primary">
                    {service.price}
                  </span>
                  <Button variant="outline" size="sm">
                    Learn More
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-8 text-center md:p-12">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              Need a Custom Solution?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Contact us for enterprise installations, large-scale projects, or custom automation requirements.
            </p>
            <Button size="lg" className="glow-primary">
              Contact Us
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Services;
