import { motion } from 'framer-motion';
import { Bot, Layers, Wrench, HeadphonesIcon, Zap, Shield } from 'lucide-react';

const reasons = [
  {
    icon: Bot,
    title: 'AI-Powered Solutions',
    description: 'The only smart home provider in Egypt using AI for personalized automation and energy optimization.',
  },
  {
    icon: Layers,
    title: 'Multi-Brand Expertise',
    description: 'We work with all major brands to give you the best product combination for your needs and budget.',
  },
  {
    icon: Wrench,
    title: 'Expert Installation',
    description: 'Our certified technicians handle everything from planning to installation with zero disruption.',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Round-the-clock technical support and maintenance services to keep your home running smoothly.',
  },
  {
    icon: Zap,
    title: 'Energy Efficiency',
    description: 'Save up to 30% on electricity bills with smart scheduling and automated power management.',
  },
  {
    icon: Shield,
    title: 'Complete Security',
    description: 'Integrated security systems with cameras, sensors, and smart locks for total peace of mind.',
  },
];

export const WhyChooseUs = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            Why Baytzaki
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4"
          >
            Why Choose Us?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            We combine cutting-edge technology with local expertise to deliver 
            smart home solutions that actually work for Egyptian homes.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <reason.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {reason.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { value: '500+', label: 'Happy Clients' },
            { value: '1,200+', label: 'Devices Installed' },
            { value: '15+', label: 'Compound Projects' },
            { value: '24/7', label: 'Support Available' },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
