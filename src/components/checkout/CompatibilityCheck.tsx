import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Suggestion = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  brand?: string | null;
  reason: string;
};
type Issue = { severity: 'warning' | 'info'; message: string };
type Result = { summary: string; issues: Issue[]; suggestions: Suggestion[] };

export function CompatibilityCheck() {
  const { items, addItem } = useCart();
  const { language, isRTL, formatPrice } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [ran, setRan] = useState(false);

  const cartKey = items.map(i => `${i.product.id}:${i.quantity}`).join('|');

  const run = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cart-compatibility-check', {
        body: {
          language: isRTL ? 'ar' : 'en',
          items: items.map(i => ({
            id: i.product.id,
            name: i.product.name,
            brand: (i.product as any).brand,
            protocol: (i.product as any).protocol,
            quantity: i.quantity,
          })),
        },
      });
      if (error) throw error;
      setResult(data as Result);
      setRan(true);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'فشل الفحص' : 'Check failed',
        description: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-run once when the component mounts / cart changes meaningfully.
  useEffect(() => {
    setRan(false);
    setResult(null);
    const t = setTimeout(() => { run(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  const addSuggestion = (s: Suggestion) => {
    addItem({
      id: s.productId,
      name: s.name,
      slug: s.slug,
      price: Number(s.price) || 0,
      image_url: s.image_url || '',
      description: '',
      category_id: '',
      stock: 1,
      brand: s.brand ?? '',
    } as any, 1);
    toast({
      title: language === 'ar' ? 'تمت الإضافة' : 'Added to cart',
      description: s.name,
    });
  };

  const hasIssues = (result?.issues?.length ?? 0) > 0;
  const hasSuggestions = (result?.suggestions?.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {language === 'ar' ? 'فحص التوافق بالذكاء الاصطناعي' : 'AI Compatibility Check'}
          </h2>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {language === 'ar' ? 'إعادة الفحص' : 'Re-check'}
        </button>
      </div>

      {loading && !result && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {language === 'ar' ? 'يفحص المساعد سلتك...' : 'AI is reviewing your cart...'}
        </div>
      )}

      {result && (
        <>
          {result.summary && (
            <p className="text-sm text-foreground mb-3">{result.summary}</p>
          )}

          {hasIssues && (
            <div className="space-y-2 mb-4">
              {result.issues.map((iss, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    iss.severity === 'warning'
                      ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30'
                      : 'bg-primary/5 text-foreground border border-primary/20'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{iss.message}</span>
                </div>
              ))}
            </div>
          )}

          {!hasIssues && !hasSuggestions && ran && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              {language === 'ar'
                ? 'سلتك متكاملة ومتوافقة ✨'
                : "Your cart looks complete and compatible ✨"}
            </div>
          )}

          {hasSuggestions && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {language === 'ar' ? 'مقترحات لإكمال إعدادك' : 'Suggested to complete your setup'}
              </p>
              <div className="grid gap-2">
                {result.suggestions.map(s => (
                  <div
                    key={s.productId}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2.5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={s.image_url || '/placeholder.svg'}
                        alt={s.name}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground mb-1">{formatPrice(s.price)}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 text-xs"
                        onClick={() => addSuggestion(s)}
                      >
                        <Plus className="h-3 w-3" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}