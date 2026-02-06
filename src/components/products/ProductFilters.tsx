import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface FilterState {
  priceRange: [number, number];
  brands: string[];
  protocols: string[];
  availability: 'all' | 'in-stock' | 'out-of-stock';
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'name-asc';
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableBrands: string[];
  availableProtocols: string[];
  maxPrice: number;
  isMobile?: boolean;
}

export const defaultFilters: FilterState = {
  priceRange: [0, 150000],
  brands: [],
  protocols: [],
  availability: 'all',
  sortBy: 'featured',
};

export function ProductFilters({
  filters,
  onFiltersChange,
  availableBrands,
  availableProtocols,
  maxPrice,
  isMobile,
}: ProductFiltersProps) {
  const { t, formatPrice, isRTL } = useLanguage();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    brands: true,
    protocol: false,
    availability: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (partial: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleBrand = (brand: string) => {
    const brands = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    update({ brands });
  };

  const toggleProtocol = (protocol: string) => {
    const protocols = filters.protocols.includes(protocol)
      ? filters.protocols.filter((p) => p !== protocol)
      : [...filters.protocols, protocol];
    update({ protocols });
  };

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.protocols.length > 0 ||
    filters.availability !== 'all' ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice;

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
    >
      {title}
      {expandedSections[section] ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <div className={cn("space-y-1", isMobile && "pb-8")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 font-display font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {t('filters')}
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ ...defaultFilters, priceRange: [0, maxPrice] })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isRTL ? 'مسح الكل' : 'Clear All'}
          </Button>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-border pb-4">
        <SectionHeader title={isRTL ? 'نطاق السعر' : 'Price Range'} section="price" />
        {expandedSections.price && (
          <div className="mt-3 space-y-3">
            <Slider
              min={0}
              max={maxPrice}
              step={100}
              value={filters.priceRange}
              onValueChange={(val) => update({ priceRange: val as [number, number] })}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatPrice(filters.priceRange[0])}</span>
              <span>{formatPrice(filters.priceRange[1])}</span>
            </div>
          </div>
        )}
      </div>

      {/* Brands */}
      <div className="border-b border-border pb-4">
        <SectionHeader title={isRTL ? 'العلامة التجارية' : 'Brand'} section="brands" />
        {expandedSections.brands && (
          <div className="mt-2 space-y-2">
            {availableBrands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.brands.includes(brand)}
                  onCheckedChange={() => toggleBrand(brand)}
                />
                <span className="text-foreground">{brand}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Protocol */}
      <div className="border-b border-border pb-4">
        <SectionHeader title={isRTL ? 'البروتوكول' : 'Protocol'} section="protocol" />
        {expandedSections.protocol && (
          <div className="mt-2 space-y-2">
            {availableProtocols.map((protocol) => (
              <label key={protocol} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.protocols.includes(protocol)}
                  onCheckedChange={() => toggleProtocol(protocol)}
                />
                <span className="text-foreground">{protocol}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="pb-4">
        <SectionHeader title={isRTL ? 'التوفر' : 'Availability'} section="availability" />
        {expandedSections.availability && (
          <div className="mt-2 space-y-2">
            {([
              { value: 'all', label: isRTL ? 'الكل' : 'All' },
              { value: 'in-stock', label: isRTL ? 'متوفر' : 'In Stock' },
              { value: 'out-of-stock', label: isRTL ? 'غير متوفر' : 'Out of Stock' },
            ] as const).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={filters.availability === opt.value}
                  onCheckedChange={() => update({ availability: opt.value })}
                />
                <span className="text-foreground">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
