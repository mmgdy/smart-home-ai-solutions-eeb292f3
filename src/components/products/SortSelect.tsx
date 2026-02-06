import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';
import type { FilterState } from './ProductFilters';

interface SortSelectProps {
  value: FilterState['sortBy'];
  onChange: (value: FilterState['sortBy']) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  const { isRTL } = useLanguage();

  const options = [
    { value: 'featured', label: isRTL ? 'المميزة أولاً' : 'Featured' },
    { value: 'price-asc', label: isRTL ? 'السعر: من الأقل للأعلى' : 'Price: Low to High' },
    { value: 'price-desc', label: isRTL ? 'السعر: من الأعلى للأقل' : 'Price: High to Low' },
    { value: 'newest', label: isRTL ? 'الأحدث' : 'Newest' },
    { value: 'name-asc', label: isRTL ? 'الاسم (أ-ي)' : 'Name (A-Z)' },
  ] as const;

  return (
    <Select value={value} onValueChange={(val) => onChange(val as FilterState['sortBy'])}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
