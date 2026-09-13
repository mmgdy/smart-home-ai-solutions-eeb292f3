import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { cairoSupplierService } from '@/data/cairoSupplierService';

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

  // Autocomplete suggestions from clean smart home catalog
  const suggestions = useMemo(() => {
    if (!localValue || localValue.length < 2 || !focused) return [];
    const q = localValue.toLowerCase();
    const catalog = cairoSupplierService.getCleanSmartHomeCatalog();
    return catalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.protocol?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [localValue, focused]);

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
                <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
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
