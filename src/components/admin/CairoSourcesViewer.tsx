import React, { useState, useEffect } from 'react';
import { cairoSupplierService, CairoSource, ProductAuditInfo } from '@/data/cairoSupplierService';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Building2, 
  Plus, 
  Sparkles,
  ShieldCheck,
  Calendar,
  DollarSign,
  Tag,
  Globe,
  Check,
  ShoppingBag,
  FileText,
  Youtube
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  productId: string;
  productName: string;
  currentPrice: number;
}

export const CairoSourcesViewer: React.FC<Props> = ({ productId, productName, currentPrice }) => {
  const [audit, setAudit] = useState<ProductAuditInfo | null>(() => cairoSupplierService.getProductAudit(productId));
  const [sources, setSources] = useState<CairoSource[]>(() => cairoSupplierService.getCairoSources(productId));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [flagState, setFlagState] = useState(0); // Trigger re-render
  
  useEffect(() => {
    setAudit(cairoSupplierService.getProductAudit(productId));
    setSources(cairoSupplierService.getCairoSources(productId));
  }, [productId, flagState]);

  const isFlaggedWrong = cairoSupplierService.isWrongImageFlagged(productId);
  const isVerified = cairoSupplierService.isImageVerified(productId);
  const wrongReason = cairoSupplierService.getWrongImageReason(productId);

  const handleToggleFlagWrong = () => {
    if (isFlaggedWrong) {
      cairoSupplierService.unflagWrongImage(productId);
    } else {
      cairoSupplierService.flagWrongImage(productId, 'Reported as wrong image by admin');
    }
    setFlagState(prev => prev + 1);
  };

  const handleMarkVerified = () => {
    cairoSupplierService.markImageVerified(productId);
    setFlagState(prev => prev + 1);
  };

  // New source form state
  const [supplierName, setSupplierName] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [priceEgp, setPriceEgp] = useState('');
  const [availability, setAvailability] = useState('In Stock');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('Nasr City, Cairo');
  const [confidence, setConfidence] = useState('95');
  const [notes, setNotes] = useState('');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !productUrl) return;

    const added = cairoSupplierService.addCustomSource(productId, {
      supplier_id: 'custom',
      supplier_name: supplierName,
      supplier_url: supplierUrl || 'https://' + supplierName.toLowerCase().replace(/\s+/g, '') + '.com',
      product_url: productUrl,
      price_egp: priceEgp ? parseFloat(priceEgp) : null,
      availability,
      phone,
      whatsapp: whatsapp || phone,
      address: area,
      city: 'Cairo',
      area,
      match_confidence: parseInt(confidence) || 90,
      notes: notes || 'Manually verified Cairo supplier'
    });

    setSources(prev => [added, ...prev]);
    setIsAddOpen(false);
    // Reset form
    setSupplierName('');
    setProductUrl('');
    setPriceEgp('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. PRODUCT AUDIT HEALTH SUMMARY */}
      <div className="bg-muted/40 p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm">Product Catalog Health & Image Verification</h4>
          </div>
          <div className="flex items-center gap-2">
            {audit?.sku && (
              <Badge variant="outline" className="font-mono text-xs">
                SKU: {audit.sku}
              </Badge>
            )}
            {isFlaggedWrong ? (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" /> Flagged: Wrong Image
              </Badge>
            ) : isVerified ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" /> Verified Image
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" /> Unverified Photo
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {/* Image Status & Action */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
            isFlaggedWrong ? 'bg-red-500/10 border-red-500/30' : 'bg-background/80'
          }`}>
            <span className="text-xs text-muted-foreground font-medium">Image Verification</span>
            <div className="flex items-center gap-1.5 font-medium">
              {isFlaggedWrong ? (
                <>
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-red-700 dark:text-red-400 font-semibold text-xs">Wrong Image Reported</span>
                </>
              ) : isVerified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-xs">Confirmed OK</span>
                </>
              ) : audit?.image_status === 'VALID' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 text-xs">HTTP 200 (Check Visual)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-red-700 dark:text-red-400 font-semibold text-xs">{audit?.image_status || 'Checking'}</span>
                </>
              )}
            </div>
            <div className="pt-1 flex items-center gap-1.5 border-t">
              {isFlaggedWrong ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleMarkVerified}
                  className="h-6 text-[11px] px-2 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 w-full"
                >
                  <Check className="w-3 h-3 mr-1" /> Mark Correct
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleToggleFlagWrong}
                  className="h-6 text-[11px] px-2 text-red-600 hover:bg-red-500/10 hover:text-red-700 w-full"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Flag as Wrong Image
                </Button>
              )}
            </div>
          </div>

          {/* Price Status */}
          <div className="p-2.5 rounded-lg bg-background/80 border flex flex-col justify-between gap-1">
            <span className="text-xs text-muted-foreground font-medium">Price Status</span>
            <div className="flex items-center gap-1.5 font-medium">
              {audit?.price_status === 'VALID' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-xs">Valid ({currentPrice.toLocaleString()} EGP)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-red-700 dark:text-red-400 text-xs">Invalid</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              Public store pricing
            </div>
          </div>

          {/* Description Status */}
          <div className="p-2.5 rounded-lg bg-background/80 border flex flex-col justify-between gap-1">
            <span className="text-xs text-muted-foreground font-medium">Description</span>
            <div className="flex items-center gap-1.5 font-medium">
              {audit?.description_status === 'VALID' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-xs">Cleaned & Formatted</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 text-xs">Needs Review</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              HTML tags sanitized
            </div>
          </div>

          {/* Cairo Sourcing Status */}
          <div className="p-2.5 rounded-lg bg-background/80 border flex flex-col justify-between gap-1">
            <span className="text-xs text-muted-foreground font-medium">Cairo Sourcing</span>
            <div className="flex items-center gap-1.5 font-medium">
              {sources.length > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-xs">{sources.length} Local Supplier{sources.length > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 text-xs">Not Found Yet</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              {audit?.lowest_cairo_price ? `Best: ${audit.lowest_cairo_price.toLocaleString()} EGP` : 'Internal registry'}
            </div>
          </div>
        </div>

        {wrongReason && isFlaggedWrong && (
          <div className="mt-3 p-2.5 bg-red-500/10 rounded-lg text-xs text-red-900 dark:text-red-300 border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span><strong>Wrong Image Note:</strong> {wrongReason}. Please upload or paste the accurate product image in the Product Details tab.</span>
          </div>
        )}

        {audit?.reason && audit.action_taken !== 'NO_CHANGE' && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded text-xs text-amber-900 dark:text-amber-300 border border-amber-500/20">
            <strong>Audit Note:</strong> {audit.reason}
          </div>
        )}
      </div>

      {/* 2. LOCAL SUPPLIERS / CAIRO SOURCES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Egypt & Cairo Suppliers ({sources.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Internal commercial intelligence for local procurement in Cairo & Egypt.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            Add Cairo Supplier
          </Button>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
            No local supplier recorded yet for this product. Click "Add Cairo Supplier" to record one.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((s, idx) => {
              const diff = s.price_egp && currentPrice > 0 ? currentPrice - s.price_egp : null;
              const marginPct = diff !== null && currentPrice > 0 ? Math.round((diff / currentPrice) * 100) : null;
              const cleanPhone = (s.whatsapp || s.phone || '').replace(/[^0-9]/g, '');
              const waText = encodeURIComponent(`Hello, I am inquiring about availability of: ${productName}`);

              return (
                <div key={s.id || idx} className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{s.supplier_name}</span>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {s.availability || 'In Stock'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          {s.match_confidence}% Match
                        </Badge>
                        {marginPct !== null && (
                          <Badge variant="outline" className={`text-[10px] py-0 ${marginPct >= 0 ? 'text-emerald-600 border-emerald-500/30' : 'text-amber-600 border-amber-500/30'}`}>
                            Store Margin: {marginPct >= 0 ? '+' : ''}{marginPct}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          {s.area || s.address || 'Cairo, Egypt'}
                        </span>
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-foreground hover:underline font-mono">
                            <Phone className="w-3 h-3 text-primary shrink-0" />
                            {s.phone}
                          </a>
                        )}
                        {cleanPhone && (
                          <a 
                            href={`https://wa.me/${cleanPhone}?text=${waText}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp Supplier
                          </a>
                        )}
                        {s.supplier_url && (
                          <a 
                            href={s.supplier_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1 hover:text-foreground text-muted-foreground"
                          >
                            <Globe className="w-3 h-3" />
                            Company Site
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-bold text-primary">
                          {s.price_egp ? `${s.price_egp.toLocaleString()} EGP` : 'Price on Request'}
                        </div>
                        {s.price_egp && currentPrice > 0 && (
                          <span className="text-[11px] text-muted-foreground block">
                            Store: {currentPrice.toLocaleString()} EGP
                          </span>
                        )}
                      </div>

                      {s.product_url && (
                        <a 
                          href={s.product_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                        >
                          Open Supplier Page
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {s.notes && (
                    <div className="mt-2.5 pt-2 border-t text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Note: </span>
                      {s.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. EXTERNAL SOURCING & MARKET RESEARCH (ADMIN EXCLUSIVE) */}
        <div className="pt-3 border-t space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>External Marketplaces & Spec Sourcing (Admin Only)</span>
            </h5>
            <span className="text-[10px] text-muted-foreground">Confidential procurement links</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={`https://www.amazon.eg/s?k=${encodeURIComponent(productName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:border-amber-500/50 hover:bg-amber-500/5 text-xs font-medium transition group"
            >
              <span className="flex items-center gap-1.5 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                Amazon Egypt
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-amber-600" />
            </a>

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${productName} datasheet specifications manual`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-xs font-medium transition group"
            >
              <span className="flex items-center gap-1.5 text-foreground group-hover:text-primary">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Datasheet & Specs
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
            </a>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${productName} smart home review setup`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:border-red-500/50 hover:bg-red-500/5 text-xs font-medium transition group"
            >
              <span className="flex items-center gap-1.5 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                Video Reviews
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-red-600" />
            </a>
          </div>
        </div>
      </div>

      {/* 3. ADD SUPPLIER MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Cairo Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSource} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs">Supplier Name *</Label>
              <Input 
                value={supplierName} 
                onChange={e => setSupplierName(e.target.value)} 
                placeholder="e.g. Sonoff Egypt, El Badr Systems, Baytzaki" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cairo Area / Location</Label>
                <Input 
                  value={area} 
                  onChange={e => setArea(e.target.value)} 
                  placeholder="e.g. Nasr City, New Cairo" 
                />
              </div>
              <div>
                <Label className="text-xs">Supplier Price (EGP)</Label>
                <Input 
                  type="number" 
                  value={priceEgp} 
                  onChange={e => setPriceEgp(e.target.value)} 
                  placeholder="e.g. 1500" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Product Listing URL *</Label>
              <Input 
                type="url" 
                value={productUrl} 
                onChange={e => setProductUrl(e.target.value)} 
                placeholder="https://..." 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="+20 100 000 0000" 
                />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="+20 100 000 0000" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Availability</Label>
                <Input 
                  value={availability} 
                  onChange={e => setAvailability(e.target.value)} 
                  placeholder="In Stock" 
                />
              </div>
              <div>
                <Label className="text-xs">Match Confidence (0-100%)</Label>
                <Input 
                  type="number" 
                  min="50" 
                  max="100" 
                  value={confidence} 
                  onChange={e => setConfidence(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. Exact model confirmed with distributor" 
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Save Supplier Source</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
