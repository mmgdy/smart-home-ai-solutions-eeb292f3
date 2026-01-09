import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';

const BRANDS = [
  { name: 'SONOFF', logo: 'https://sonoff.tech/wp-content/uploads/2023/02/logo-1.svg' },
  { name: 'MOES', logo: 'https://www.moeshouse.com/cdn/shop/files/logo_4d2fccb7-7ea3-44a2-857f-3f2e02a21e53_180x.png?v=1614679316' },
  { name: 'Philips', logo: 'https://www.philips.com/c-dam/corporate/newscenter/global/standard/resources/healthcare/2020/philips-shield/philips-shield-logo.svg' },
  { name: 'TP-Link', logo: 'https://static.tp-link.com/upload/logo/tplink-logo-2019.svg' },
];

export function BrandShowcase() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-muted/30 relative overflow-hidden">
      <div className="container px-6 md:px-12">
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm tracking-[0.2em] uppercase text-muted-foreground font-medium mb-12"
        >
          Trusted Brands We Carry
        </motion.p>
        
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
          {BRANDS.map((brand, index) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
            >
              <div className="h-8 md:h-10 flex items-center">
                <span className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  {brand.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
