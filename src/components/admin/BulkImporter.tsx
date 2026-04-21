import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Globe2, Loader2, DollarSign, Sparkles, CheckCircle2, XCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function BulkImporter({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();

  // Crawler state
  const [rootUrl, setRootUrl] = useState('');
  const [urlFilter, setUrlFilter] = useState('product');
  const [maxProducts, setMaxProducts] = useState(15);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResults, setCrawlResults] = useState<any[]>([]);
  const [crawlSummary, setCrawlSummary] = useState<{ discovered: number; imported: number } | null>(null);

  // Recalibrate state
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [recalibrateProgress, setRecalibrateProgress] = useState(0);
  const [recalibrateResults, setRecalibrateResults] = useState<any[]>([]);

  // Fix existing state
  const [isFixing, setIsFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [fixResults, setFixResults] = useState<any[]>([]);

  const handleCrawl = async () => {
    if (!rootUrl.trim()) return;
    setIsCrawling(true);
    setCrawlResults([]);
    setCrawlSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('crawl-catalog', {
        body: {
          rootUrl: rootUrl.trim(),
          token: adminToken,
          maxProducts,
          urlFilter: urlFilter.trim(),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Crawl failed');

      setCrawlResults(data.results || []);
      setCrawlSummary({ discovered: data.discovered, imported: data.imported });
      toast({
        title: 'Catalog imported!',
        description: `${data.imported} of ${data.discovered} products added.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Crawl failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleRecalibrate = async () => {
    setIsRecalibrating(true);
    setRecalibrateResults([]);
    setRecalibrateProgress(0);

    try {
      const totalBatches = 5;
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('recalibrate-prices', {
          body: { token: adminToken, batchSize: 10 },
        });
        if (error) throw error;
        if (data?.results) setRecalibrateResults((prev) => [...prev, ...data.results]);
        setRecalibrateProgress(((i + 1) / totalBatches) * 100);
        if (!data?.results?.length) break;
      }
      toast({ title: 'Prices recalibrated!', description: 'Updated to realistic Egyptian market values.' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Recalibration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsRecalibrating(false);
    }
  };

  const handleFixExisting = async () => {
    setIsFixing(true);
    setFixResults([]);
    setFixProgress(0);

    try {
      // Process in 8 rounds of 15 = up to 120 products per click
      const totalRounds = 8;
      for (let i = 0; i < totalRounds; i++) {
        const { data, error } = await supabase.functions.invoke('crawl-catalog', {
          body: { token: adminToken, mode: 'fix-existing', batchSize: 15 },
        });
        if (error) throw error;
        if (data?.results) setFixResults((prev) => [...prev, ...data.results]);
        setFixProgress(((i + 1) / totalRounds) * 100);
        if (!data?.results?.length) break;
      }
      toast({
        title: 'Products refreshed!',
        description: 'Real images & realistic EGP prices applied.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Catalog crawler */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-primary" />
          Catalog Crawler — Import Many Products from One URL
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Paste any catalog page (e.g. <code className="text-xs">https://sonoff.tech/product-category/smart-home/</code>).
          We'll discover up to {maxProducts} product pages, extract real images & specs, and add them to your store.
        </p>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="md:col-span-3">
            <Label>Root URL</Label>
            <Input
              placeholder="https://sonoff.tech/product-category/smart-home/"
              value={rootUrl}
              onChange={(e) => setRootUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>URL filter (keyword)</Label>
            <Input
              placeholder="product"
              value={urlFilter}
              onChange={(e) => setUrlFilter(e.target.value)}
            />
          </div>
          <div>
            <Label>Max products</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxProducts}
              onChange={(e) => setMaxProducts(Number(e.target.value))}
            />
          </div>
        </div>

        <Button onClick={handleCrawl} disabled={isCrawling || !rootUrl.trim()} size="lg" className="w-full">
          {isCrawling ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Crawling & importing...</>
          ) : (
            <><Globe2 className="w-4 h-4 mr-2" /> Discover & Import Products</>
          )}
        </Button>

        {crawlSummary && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            Discovered <strong>{crawlSummary.discovered}</strong> URLs · Imported{' '}
            <strong className="text-success">{crawlSummary.imported}</strong>
          </div>
        )}

        {crawlResults.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto space-y-1 text-xs">
            {crawlResults.map((r, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name || r.url}</div>
                  {!r.success && <div className="text-muted-foreground">{r.error}</div>}
                  {r.success && r.price && <div className="text-muted-foreground">EGP {r.price}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price recalibrator */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Recalibrate Prices to Egyptian Market
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Uses AI market knowledge to set realistic EGP prices. For real web-backed images and prices,
          use the refresh tool below.
        </p>

        <Button
          onClick={handleRecalibrate}
          disabled={isRecalibrating}
          size="lg"
          className="w-full"
        >
          {isRecalibrating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recalibrating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Recalibrate Next 50 Products</>
          )}
        </Button>

        {isRecalibrating && (
          <Progress value={recalibrateProgress} className="mt-4" />
        )}

        {recalibrateResults.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto space-y-1 text-xs">
            {recalibrateResults.map((r, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.success ? (
                    <div className="text-muted-foreground">
                      {r.old_price} → <span className="text-success font-semibold">{r.new_price}</span> EGP ({r.confidence})
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{r.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fix existing products: real image + realistic price via web search */}
      <div className="bg-card border-2 border-primary/40 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Refresh ALL Existing Products — Real Images + Real Prices
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          For each existing product, searches global websites with Firecrawl, pulls real product images,
          and converts worldwide market prices to realistic EGP. Processes up to 120 products per click.
        </p>

        <Button
          onClick={handleFixExisting}
          disabled={isFixing}
          size="lg"
          variant="default"
          className="w-full"
        >
          {isFixing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing products from the web...</>
          ) : (
            <><Wand2 className="w-4 h-4 mr-2" /> Refresh Next 120 Products</>
          )}
        </Button>

        {isFixing && <Progress value={fixProgress} className="mt-4" />}

        {fixResults.length > 0 && (
          <div className="mt-4 max-h-72 overflow-y-auto space-y-1 text-xs">
            <div className="text-sm font-medium mb-2">
              Updated{' '}
              <span className="text-success">
                {fixResults.filter((r) => r.success).length}
              </span>{' '}
              of {fixResults.length}
            </div>
            {fixResults.map((r, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.success ? (
                    <div className="text-muted-foreground">
                      EGP {r.old_price} → <span className="text-success font-semibold">{r.new_price}</span>
                      {r.image_updated && <span className="ml-2">· image updated</span>}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{r.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
