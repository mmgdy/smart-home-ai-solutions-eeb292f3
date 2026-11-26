import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { fetchHiddenProductIds, filterPublicProducts } from '@/lib/productVisibility';
import { getTextDirection, isolateBidiUnits } from '@/lib/bidi';

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
  const queryClient = useQueryClient();
  const { t, formatPrice } = useLanguage();

  const cachedProducts = queryClient.getQueryData<any[]>(['products']);

  const { data: hiddenIds } = useQuery({
    queryKey: ['hidden-product-ids'],
    queryFn: fetchHiddenProductIds,
    staleTime: 60 * 1000,
  });

  const needsFallbackFetch = !cachedProducts?.length && (focused || localValue.length >= 2);
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
    enabled: needsFallbackFetch,
    staleTime: 60 * 1000,
  });

  const pool = (cachedProducts && cachedProducts.length > 0 ? cachedProducts : searchProducts) as Product[] | undefined;

  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => onChange(localValue), 250);
    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const suggestions = useMemo(() => {
    if (!localValue || localValue.length < 2 || !focused || !pool || hiddenIds === undefined) return [];
    const q = localValue.toLowerCase();
    return filterPublicProducts(pool, hiddenIds)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [localValue, focused, pool, hiddenIds]);

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
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/65 pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder={t('searchProducts')}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setFocused(true)}
        className="h-11 lg:h-10 rounded-xl ps-10 pe-10 bg-background/60 border-border/80 focus-visible:border-primary/70 text-foreground placeholder:text-foreground/60"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => { setLocalValue(''); onChange(''); }}
          aria-label="Clear search"
          className="absolute end-3 top-1/2 -translate-y-1/2 text-foreground/65 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden divide-y divide-border/50">
          {suggestions.map((item) => (
            <Link
              key={item.id}
              to={`/products/${item.slug}`}
              onClick={() => setFocused(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-primary/10 transition-colors"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 rounded-lg object-contain p-1 azka-studio-surface shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted/50 border border-border/60 shrink-0 flex items-center justify-center">
                  <Search className="h-4 w-4 text-foreground/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  dir={getTextDirection(item.name)}
                  style={{ unicodeBidi: 'isolate' }}
                  className="text-sm font-medium text-foreground truncate text-start"
                >
                  {isolateBidiUnits(item.name)}
                </p>
                {item.brand && (
                  <p dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-xs text-foreground/70 truncate text-start">
                    {item.brand}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold text-primary whitespace-nowrap shrink-0">
                {formatPrice(item.price)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
