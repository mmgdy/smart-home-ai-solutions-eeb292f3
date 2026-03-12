import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';

const BRANDS = [
  'SONOFF', 'MOES', 'TP-Link', 'FIBARO', 'MCOHome', 'HELTUN', 'Danalock', 'Arylic', 'Philips', 'Tuya',
];

export function BrandShowcase() {
  const { isRTL } = useLanguage();

  return (
    <section className="py-12 bg-background border-y border-border/50">
      <div className="container px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium mb-8"
        >
          {isRTL ? 'علامات تجارية أصلية معتمدة' : 'Authorized Genuine Brands'}
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {BRANDS.map((brand, index) => (
            <motion.span
              key={brand}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
              className="font-display text-sm md:text-base font-bold tracking-tight text-muted-foreground/60 hover:text-foreground transition-colors cursor-default"
            >
              {brand}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
