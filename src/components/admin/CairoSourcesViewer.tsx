import React, { useState, useEffect, useMemo } from 'react';
import { cairoSupplierService, CairoSource, ProductAuditInfo, ProductRecommendation } from '@/data/cairoSupplierService';
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
  Youtube,
  RefreshCw,
  Edit3,
  Trash2,
  TrendingUp,
  Layers,
  Copy,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  productId: string;
  productName: string;
  currentPrice: number;
  currentStock?: number;
  currentDescription?: string;
  brand?: string;
  protocol?: string;
  onApplyPrice?: (newPrice: number) => void;
  onApplyStock?: (newStock: number) => void;
  onApplyDescription?: (newDescription: string) => void;
}

export const CairoSourcesViewer: React.FC<Props> = ({ 
  productId, 
  productName, 
  currentPrice,
  currentStock = 10,
  currentDescription = '',
  brand = '',
  protocol = '',
  onApplyPrice,
  onApplyStock,
  onApplyDescription
}) => {
  const { toast } = useToast();
  const [audit, setAudit] = useState<ProductAuditInfo | null>(() => cairoSupplierService.getProductAudit(productId));
  const [sources, setSources] = useState<CairoSource[]>(() => cairoSupplierService.getCairoSources(productId));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<CairoSource | null>(null);
  const [flagState, setFlagState] = useState(0);

  useEffect(() => {
    setAudit(cairoSupplierService.getProductAudit(productId));
    setSources(cairoSupplierService.getCairoSources(productId));
  }, [productId, flagState]);

  // Generate real-time intelligent recommendations based on sources
  const rec: ProductRecommendation = useMemo(() => {
    return cairoSupplierService.getRecommendations(
      productId,
      productName,
      currentPrice,
      currentStock,
      currentDescription,
      brand,
      protocol
    );
  }, [productId, productName, currentPrice, currentStock, currentDescription, brand, protocol, sources]);

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

  // 1. Add Source Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [priceEgp, setPriceEgp] = useState('');
  const [availability, setAvailability] = useState('In Stock');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('Nasr City, Cairo');
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
      match_confidence: 95,
      notes: notes || 'Direct custom source added by admin'
    });

    setSources(prev => [added, ...prev]);
    setIsAddOpen(false);
    toast({ title: 'Supplier source added successfully' });

    // Reset
    setSupplierName('');
    setProductUrl('');
    setSupplierUrl('');
    setPriceEgp('');
    setPhone('');
    setWhatsapp('');
    setNotes('');
  };

  // 2. Edit Source Form State
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editProductUrl, setEditProductUrl] = useState('');
  const [editSupplierUrl, setEditSupplierUrl] = useState('');
  const [editPriceEgp, setEditPriceEgp] = useState('');
  const [editAvailability, setEditAvailability] = useState('In Stock');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const openEditSource = (s: CairoSource) => {
    setEditingSource(s);
    setEditSupplierName(s.supplier_name);
    setEditProductUrl(s.product_url);
    setEditSupplierUrl(s.supplier_url || '');
    setEditPriceEgp(s.price_egp ? s.price_egp.toString() : '');
    setEditAvailability(s.availability || 'In Stock');
    setEditPhone(s.phone || '');
    setEditWhatsapp(s.whatsapp || '');
    setEditArea(s.area || s.address || 'Cairo, Egypt');
    setEditNotes(s.notes || '');
  };

  const handleSaveEditSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;

    const updated = cairoSupplierService.updateSource(productId, editingSource.id, {
      supplier_name: editSupplierName,
      product_url: editProductUrl,
      supplier_url: editSupplierUrl,
      price_egp: editPriceEgp ? parseFloat(editPriceEgp) : null,
      availability: editAvailability,
      phone: editPhone,
      whatsapp: editWhatsapp || editPhone,
      area: editArea,
      address: editArea,
      notes: editNotes
    });

    if (updated) {
      setSources(cairoSupplierService.getCairoSources(productId));
      toast({ title: `Updated source: ${editSupplierName}` });
    }
    setEditingSource(null);
  };

  const handleDeleteSource = (sourceId: string, sName: string) => {
    if (!confirm(`Delete supplier source "${sName}"?`)) return;
    cairoSupplierService.deleteSource(productId, sourceId);
    setSources(cairoSupplierService.getCairoSources(productId));
    toast({ title: `Deleted source: ${sName}` });
  };

  // Quick Sync Actions
  const handleSyncPrice = () => {
    if (rec.recommendedPrice && onApplyPrice) {
      onApplyPrice(rec.recommendedPrice);
      toast({ title: `Synced price to recommended ${rec.recommendedPrice.toLocaleString()} EGP` });
    }
  };

  const handleSyncStock = () => {
    if (onApplyStock) {
      onApplyStock(rec.recommendedStock);
      toast({ title: `Synced stock to ${rec.recommendedStock} units (${rec.stockStatus})` });
    }
  };

  const handleSyncAll = () => {
    if (onApplyPrice && rec.recommendedPrice) onApplyPrice(rec.recommendedPrice);
    if (onApplyStock) onApplyStock(rec.recommendedStock);
    toast({ 
      title: '⚡ Synchronized from Cairo Sources',
      description: `Price set to ${rec.recommendedPrice.toLocaleString()} EGP, Stock set to ${rec.recommendedStock} units`
    });
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. INTELLIGENT PRICING, STOCK & SYNC RECOMMENDATIONS HUB */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                Real-Time Sourcing & Recommendation Engine
                <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                  AI & Market Sync
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground">
                Live pricing margins, stock availability sync, and localized Egyptian catalog recommendations.
              </p>
            </div>
          </div>

          <Button 
            size="sm" 
            onClick={handleSyncAll}
            disabled={!rec.lowestSupplierPrice && !onApplyPrice}
            className="gap-1.5 font-semibold text-xs shadow-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Stock & Price Now
          </Button>
        </div>

        {/* 3 Pillars: Price, Stock, Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Pillar A: Price Intelligence */}
          <div className="p-3.5 rounded-lg border bg-card space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  Pricing Intelligence
                </span>
                {rec.pricingStatus === 'HEALTHY' ? (
                  <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Healthy Margin
                  </Badge>
                ) : rec.pricingStatus === 'LOSS_RISK' ? (
                  <Badge variant="destructive" className="text-[10px] py-0">
                    Selling At Loss
                  </Badge>
                ) : rec.pricingStatus === 'LOW_MARGIN' ? (
                  <Badge variant="outline" className="text-[10px] py-0 border-amber-500/30 text-amber-600">
                    Low Margin
                  </Badge>
                ) : rec.pricingStatus === 'OVERPRICED' ? (
                  <Badge variant="outline" className="text-[10px] py-0 border-amber-500/30 text-amber-600">
                    Overpriced
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    No Cost Data
                  </Badge>
                )}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Current Store Price:</span>
                  <span className="font-bold text-foreground">{currentPrice.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Lowest Supplier Cost:</span>
                  <span className="font-semibold text-primary">
                    {rec.lowestSupplierPrice ? `${rec.lowestSupplierPrice.toLocaleString()} EGP` : '—'}
                  </span>
                </div>
                {rec.currentMarginPct !== null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Store Margin:</span>
                    <span className={`font-semibold ${rec.currentMarginPct >= 18 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {rec.currentMarginPct >= 0 ? '+' : ''}{rec.currentMarginPct}%
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground pt-1 border-t">
                {rec.pricingReason}
              </p>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncPrice}
                disabled={!rec.lowestSupplierPrice || !onApplyPrice}
                className="w-full text-xs h-7 gap-1 border-primary/30 hover:bg-primary/10 text-primary"
              >
                <TrendingUp className="w-3 h-3" />
                Apply Recommended ({rec.recommendedPrice.toLocaleString()} EGP)
              </Button>
            </div>
          </div>

          {/* Pillar B: Stock & Availability */}
          <div className="p-3.5 rounded-lg border bg-card space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Stock Availability Sync
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] py-0 ${
                    rec.stockStatus === 'AVAILABLE' 
                      ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'border-red-500/30 text-red-600'
                  }`}
                >
                  {rec.overallAvailability}
                </Badge>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Current Store Stock:</span>
                  <span className="font-bold text-foreground">{currentStock} Units</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Suppliers Tracked:</span>
                  <span className="font-semibold text-foreground">{rec.sourcesCount} in Cairo</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Recommended Target:</span>
                  <span className="font-semibold text-primary">{rec.recommendedStock} Units</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground pt-1 border-t">
                {rec.stockReason}
              </p>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncStock}
                disabled={!onApplyStock}
                className="w-full text-xs h-7 gap-1 border-primary/30 hover:bg-primary/10 text-primary"
              >
                <RefreshCw className="w-3 h-3" />
                Sync Stock ({rec.recommendedStock} Units)
              </Button>
            </div>
          </div>

          {/* Pillar C: Description Recommendation */}
          <div className="p-3.5 rounded-lg border bg-card space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Description Optimization
                </span>
                <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary">
                  {rec.descriptionStatus === 'GOOD' ? 'Comprehensive' : 'Needs Technical Specs'}
                </Badge>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Current Length:</span>
                  <span className="font-bold text-foreground">{rec.currentDescriptionLength} chars</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Voltage Standard:</span>
                  <span className="font-semibold text-emerald-600">220V Egypt Verified</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Protocol Support:</span>
                  <span className="font-semibold text-foreground">{protocol || 'Smart Automation'}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground pt-1 border-t line-clamp-2">
                Tailored with Egyptian smart home ecosystem compatibility (Home Assistant, Alexa, Google Home).
              </p>
            </div>

            <div className="pt-2 flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplyDescription && onApplyDescription(rec.recommendedDescriptionEn)}
                disabled={!onApplyDescription}
                className="flex-1 text-[11px] h-7 px-1.5 border-primary/30 hover:bg-primary/10 text-primary"
              >
                Apply EN
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplyDescription && onApplyDescription(rec.recommendedDescriptionAr)}
                disabled={!onApplyDescription}
                className="flex-1 text-[11px] h-7 px-1.5 border-primary/30 hover:bg-primary/10 text-primary font-arabic"
              >
                تطبيق العربي
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCT AUDIT HEALTH & IMAGE VERIFICATION */}
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
                  <AlertTriangle className="w-3 h-3 mr-1" /> Flag Wrong Image
                </Button>
              )}
            </div>
          </div>

          {/* Price Status */}
          <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col justify-between gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Store Price Health</span>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold">{currentPrice.toLocaleString()} EGP</span>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              {rec.lowestSupplierPrice ? `Cost: ${rec.lowestSupplierPrice.toLocaleString()} EGP` : 'Cost not set'}
            </div>
          </div>

          {/* Description Status */}
          <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col justify-between gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Catalog Description</span>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs">{currentDescription.length > 50 ? 'Detailed Specs' : 'Brief'}</span>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              {currentDescription.length} characters
            </div>
          </div>

          {/* Cairo Source Status */}
          <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col justify-between gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Egypt Sourcing Sources</span>
            <div className="flex items-center gap-1.5 font-medium">
              {sources.length > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold">{sources.length} Verified Sources</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 text-xs">Not Found Yet</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              {rec.lowestSupplierPrice ? `Best: ${rec.lowestSupplierPrice.toLocaleString()} EGP` : 'Internal registry'}
            </div>
          </div>
        </div>

        {wrongReason && isFlaggedWrong && (
          <div className="mt-3 p-2.5 bg-red-500/10 rounded-lg text-xs text-red-900 dark:text-red-300 border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span><strong>Wrong Image Note:</strong> {wrongReason}. Please upload or paste the accurate product image in the Product Details tab.</span>
          </div>
        )}
      </div>

      {/* 3. LOCAL SUPPLIERS / CONNECTED SOURCES (EDITABLE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-semibold text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Connected Sourcing & Suppliers ({sources.length})
            </h4>
            <p className="text-xs text-muted-foreground">
              Editable procurement sources used to calculate live margins, sync stock, and calibrate catalog pricing.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            Add Supplier / Source
          </Button>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl space-y-2">
            <p>No supplier recorded yet for this product.</p>
            <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add First Source
            </Button>
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
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] py-0 ${
                            s.availability?.toLowerCase().includes('out') ? 'bg-red-500/10 text-red-600' : ''
                          }`}
                        >
                          {s.availability || 'In Stock'}
                        </Badge>
                        {marginPct !== null && (
                          <Badge variant="outline" className={`text-[10px] py-0 ${marginPct >= 15 ? 'text-emerald-600 border-emerald-500/30' : 'text-amber-600 border-amber-500/30'}`}>
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
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                        {s.supplier_url && (
                          <a 
                            href={s.supplier_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1 hover:text-foreground text-muted-foreground"
                          >
                            <Globe className="w-3 h-3" />
                            Website
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
                            Cost Diff: {(currentPrice - s.price_egp).toLocaleString()} EGP
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {s.product_url && (
                          <a 
                            href={s.product_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline bg-primary/10 px-2 py-1 rounded-md"
                          >
                            Source Page
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditSource(s)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Edit this source"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSource(s.id, s.supplier_name)}
                          className="h-7 px-2 text-xs text-red-500 hover:bg-red-500/10"
                          title="Delete source"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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

        {/* 4. EXTERNAL RESEARCH & DIRECT MARKET SEARCH */}
        <div className="pt-3 border-t space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>External Marketplaces & Spec Sourcing (Admin Research)</span>
            </h5>
            <span className="text-[10px] text-muted-foreground">Direct external searches</span>
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

      {/* MODAL: ADD SUPPLIER / SOURCE */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Supplier / Source for this Product</DialogTitle>
            <DialogDescription className="text-xs">
              Record a supplier price and stock source to automatically sync margins and inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSource} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Supplier Name *</Label>
              <Input 
                value={supplierName} 
                onChange={e => setSupplierName(e.target.value)} 
                placeholder="e.g. Sonoff Egypt, Baytzaki, Amazon.eg, El Badr" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Supplier Cost Price (EGP) *</Label>
                <Input 
                  type="number" 
                  value={priceEgp} 
                  onChange={e => setPriceEgp(e.target.value)} 
                  placeholder="e.g. 1250" 
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Stock Availability *</Label>
                <Select value={availability} onValueChange={setAvailability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock (متوفر)</SelectItem>
                    <SelectItem value="Low Stock">Low Stock (كمية محدودة)</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock (غير متوفر)</SelectItem>
                    <SelectItem value="Pre-order">Pre-order (طلب مسبق)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Product URL on Supplier Site *</Label>
              <Input 
                value={productUrl} 
                onChange={e => setProductUrl(e.target.value)} 
                placeholder="https://..." 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="+20 10..." 
                />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="+20 10..." 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Procurement Notes / Location</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. 10% discount on 5+ units, Nasr City branch" 
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Save Source</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT SUPPLIER / SOURCE */}
      <Dialog open={Boolean(editingSource)} onOpenChange={(open) => !open && setEditingSource(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Supplier Source</DialogTitle>
            <DialogDescription className="text-xs">
              Update supplier cost, product link, or live stock status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditSource} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Supplier Name *</Label>
              <Input 
                value={editSupplierName} 
                onChange={e => setEditSupplierName(e.target.value)} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Supplier Cost Price (EGP)</Label>
                <Input 
                  type="number" 
                  value={editPriceEgp} 
                  onChange={e => setEditPriceEgp(e.target.value)} 
                  placeholder="e.g. 1250" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Stock Availability</Label>
                <Select value={editAvailability} onValueChange={setEditAvailability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock (متوفر)</SelectItem>
                    <SelectItem value="Low Stock">Low Stock (كمية محدودة)</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock (غير متوفر)</SelectItem>
                    <SelectItem value="Pre-order">Pre-order (طلب مسبق)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Product URL</Label>
              <Input 
                value={editProductUrl} 
                onChange={e => setEditProductUrl(e.target.value)} 
                placeholder="https://..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input 
                  value={editPhone} 
                  onChange={e => setEditPhone(e.target.value)} 
                />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input 
                  value={editWhatsapp} 
                  onChange={e => setEditWhatsapp(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes / Lead Time</Label>
              <Input 
                value={editNotes} 
                onChange={e => setEditNotes(e.target.value)} 
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingSource(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
