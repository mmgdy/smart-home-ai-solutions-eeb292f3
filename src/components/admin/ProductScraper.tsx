import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Globe, Loader2, Plus, ExternalLink, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  brand: string | null;
  image_url: string | null;
  images: string[];
  specifications: Record<string, string>;
  protocol: string | null;
  category: string;
  slug: string;
  source_url: string;
}

export function ProductScraper({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editProtocol, setEditProtocol] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    setScrapedProduct(null);
    setSaved(false);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-product`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ url: url.trim(), adminToken }),
        }
      );

      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || 'Scrape failed');

      const p = data.product as ScrapedProduct;
      setScrapedProduct(p);
      setEditName(p.name);
      setEditPrice(String(p.price));
      setEditOriginalPrice(p.original_price ? String(p.original_price) : '');
      setEditDescription(p.description || '');
      setEditBrand(p.brand || '');
      setEditProtocol(p.protocol || '');
      setEditVideoUrl('');

      toast({ title: 'Product extracted!', description: p.name });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Scrape failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleSave = async () => {
    if (!scrapedProduct) return;
    setIsSaving(true);

    try {
      const slug = editName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);

      const { error } = await supabase.from('products').insert({
        name: editName,
        slug,
        price: parseFloat(editPrice),
        original_price: editOriginalPrice ? parseFloat(editOriginalPrice) : null,
        description: editDescription,
        brand: editBrand || null,
        protocol: editProtocol || null,
        image_url: scrapedProduct.image_url,
        images: scrapedProduct.images || [],
        specifications: scrapedProduct.specifications || {},
        stock: 10,
        featured: false,
        video_url: editVideoUrl || null,
      } as any);

      if (error) throw error;

      setSaved(true);
      toast({ title: 'Product saved!', description: `${editName} added to store` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Import Product from URL
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Paste any product URL (Amazon, Noon, AliExpress, etc.) and AI will extract all product details.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="https://www.amazon.eg/dp/B0... or any product URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleScrape} disabled={isScraping || !url.trim()}>
          {isScraping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
          {isScraping ? 'Extracting...' : 'Extract'}
        </Button>
      </div>

      {scrapedProduct && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-start gap-4">
            {scrapedProduct.image_url && (
              <img
                src={scrapedProduct.image_url}
                alt={editName}
                className="w-24 h-24 object-cover rounded-lg border"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{editName}</h3>
              <p className="text-sm text-muted-foreground">{scrapedProduct.category}</p>
              <a
                href={scrapedProduct.source_url}
                target="_blank"
                rel="noopener"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" /> Source
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Product Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
            </div>
            <div>
              <Label>Price (EGP)</Label>
              <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div>
              <Label>Original Price (EGP)</Label>
              <Input type="number" value={editOriginalPrice} onChange={(e) => setEditOriginalPrice(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Protocol</Label>
              <Input value={editProtocol} onChange={(e) => setEditProtocol(e.target.value)} placeholder="WiFi, Zigbee, Z-Wave..." />
            </div>
            <div>
              <Label>Installation Video URL (YouTube)</Label>
              <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
          </div>

          {scrapedProduct.specifications && Object.keys(scrapedProduct.specifications).length > 0 && (
            <div>
              <Label className="mb-2 block">Extracted Specifications</Label>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                {Object.entries(scrapedProduct.specifications).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="w-full"
            size="lg"
          >
            {saved ? (
              <><Check className="w-4 h-4 mr-2" /> Saved to Store</>
            ) : isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Add to Store</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
