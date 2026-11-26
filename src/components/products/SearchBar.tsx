import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { fetchHiddenProductIds, filterPublicProducts } from '@/lib/productVisibility';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, formatPrice } = useLanguage();

  const { data: hiddenIds } = useQuery({
    queryKey: ['hidden-product-ids'],
    queryFn: fetchHiddenProductIds,
    staleTime: 30 * 1000,
  });

  const { data: searchProducts } = useQuery({
    queryKey: ['search-products'],
    queryFn: async () => {
      const pageSize = 1000;
      const rows: Product[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, brand, price, image_url, protocol, description, is_published')
          .is('parent_id', null)
          .neq('is_published', false)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...((data as unknown as Product[]) || []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    },
    staleTime: 30 * 1000,
  });

  // Debounce the parent onChange
  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => onChange(localValue), 300);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Autocomplete suggestions from live published products only
  const suggestions = useMemo(() => {
    if (!localValue || localValue.length < 2 || !focused || !searchProducts || hiddenIds === undefined) return [];
    const q = localValue.toLowerCase();
    return filterPublicProducts(searchProducts, hiddenIds)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [localValue, focused, searchProducts, hiddenIds]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showSuggestions = focused && suggestions && suggestions.length > 0 && localValue.length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder={t('searchProducts')}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setFocused(true)}
        className="ps-10 pe-10"
      />
      {localValue && (
        <button
          onClick={() => { setLocalValue(''); onChange(''); }}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div className="absolute top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
          {suggestions.map((item) => (
            <Link
              key={item.id}
              to={`/products/${item.slug}`}
              onClick={() => setFocused(false)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 transition-colors"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-contain p-0.5 bg-muted/30 border border-border/40 shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted/40 border border-border/40 shrink-0 flex items-center justify-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
              </div>
              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                {formatPrice(item.price)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
