import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Send, ShoppingCart, Phone, Mail, Loader2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '@/hooks/useCalculator';
import { ROOM_TYPES, FEATURE_TYPES, FeatureType } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { Product } from '@/types/store';

// Map feature types to product search terms
const FEATURE_TO_PRODUCT_KEYWORDS: Record<FeatureType, string[]> = {
  smart_lighting: ['smart bulb', 'smart light', 'led bulb', 'zigbee bulb'],
  smart_curtains: ['curtain motor', 'smart curtain', 'blind motor'],
  smart_ac: ['ir controller', 'ac controller', 'mini r4'],
  motion_sensor: ['motion sensor', 'pir sensor', 'zigbee motion'],
  door_sensor: ['door sensor', 'window sensor', 'contact sensor'],
  temperature_sensor: ['temperature sensor', 'temp humidity', 'snzb-02'],
  smart_lock: ['smart lock', 'door lock', 'fingerprint lock'],
  camera: ['camera', 'security camera', 'ip camera'],
  intercom: ['intercom', 'video doorbell', 'door phone'],
  smart_plug: ['smart plug', 'zigbee plug', 's26'],
  smart_switch: ['smart switch', 'wall switch', 'touch switch', 'tx series'],
  rgb_lighting: ['rgb', 'color bulb', 'led strip', 'nspanel'],
  water_leak_sensor: ['water leak', 'flood sensor', 'water sensor'],
  smoke_detector: ['smoke detector', 'smoke sensor', 'fire alarm'],
  smart_thermostat: ['thermostat', 'temperature controller'],
};

interface MatchedProduct {
  product: Product;
  featureType: FeatureType;
  roomId: string;
  roomName: string;
  quantity: number;
}

export function QuoteSummaryWithCart() {
  const navigate = useNavigate();
  const { 
    rooms, 
    devices, 
    getSubtotal, 
    getInstallationFee, 
    getTotal,
    setStep,
    email,
    phone,
    setContactInfo,
    propertyType,
    getQuoteData,
    reset,
  } = useCalculator();
  const { isRTL, formatPrice } = useLanguage();
  const { toast } = useToast();
  const { addItem } = useCart();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [localEmail, setLocalEmail] = useState(email);
  const [localPhone, setLocalPhone] = useState(phone);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Fetch and match products from database
  useEffect(() => {
    const fetchAndMatchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .gt('stock', 0);

        if (error) throw error;

        const matched: MatchedProduct[] = [];

        // For each device recommendation, find a matching product
        devices.forEach((device) => {
          const keywords = FEATURE_TO_PRODUCT_KEYWORDS[device.featureType] || [];
          
          // Find best matching product
          let bestMatch: Product | null = null;
          let bestScore = 0;

          (products || []).forEach((product: any) => {
            const productName = product.name.toLowerCase();
            const productDesc = (product.description || '').toLowerCase();
            
            keywords.forEach((keyword) => {
              const keywordLower = keyword.toLowerCase();
              if (productName.includes(keywordLower) || productDesc.includes(keywordLower)) {
                // Score based on price proximity to expected price
                const priceScore = 1 / (1 + Math.abs(product.price - device.price) / device.price);
                const nameMatchScore = productName.includes(keywordLower) ? 2 : 1;
                const score = priceScore * nameMatchScore;
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = {
                    ...product,
                    images: product.images || [],
                    specifications: product.specifications || {},
                  } as Product;
                }
              }
            });
          });

          if (bestMatch) {
            matched.push({
              product: bestMatch,
              featureType: device.featureType,
              roomId: device.roomId,
              roomName: device.roomName,
              quantity: device.quantity,
            });
          }
        });

        setMatchedProducts(matched);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchAndMatchProducts();
  }, [devices]);

  // Calculate totals from matched products
  const productSubtotal = matchedProducts.reduce(
    (sum, mp) => sum + mp.product.price * mp.quantity, 
    0
  );
  const installationFee = Math.max(500, Math.round(productSubtotal * 0.15));
  const total = productSubtotal + installationFee;

  // Group matched products by room
  const productsByRoom = matchedProducts.reduce((acc, mp) => {
    if (!acc[mp.roomId]) {
      acc[mp.roomId] = [];
    }
    acc[mp.roomId].push(mp);
    return acc;
  }, {} as Record<string, MatchedProduct[]>);

  const handleAddAllToCart = async () => {
    setIsAddingToCart(true);
    try {
      matchedProducts.forEach((mp) => {
        addItem(mp.product, mp.quantity);
      });

      toast({
        title: isRTL ? 'تمت الإضافة للسلة!' : 'Added to Cart!',
        description: isRTL 
          ? `تم إضافة ${matchedProducts.length} منتج إلى سلة التسوق`
          : `${matchedProducts.length} products added to cart`,
      });

      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء الإضافة للسلة' : 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!localEmail && !localPhone) {
      toast({
        title: isRTL ? 'مطلوب معلومات الاتصال' : 'Contact Info Required',
        description: isRTL 
          ? 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف'
          : 'Please enter email or phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setContactInfo(localEmail, localPhone);

    try {
      const quoteData = getQuoteData();
      
      // Include matched products in devices
      const devicesWithProducts = matchedProducts.map(mp => ({
        productId: mp.product.id,
        productName: mp.product.name,
        brand: mp.product.brand || 'Generic',
        price: mp.product.price,
        quantity: mp.quantity,
        roomId: mp.roomId,
        roomName: mp.roomName,
        featureType: mp.featureType,
        imageUrl: mp.product.image_url,
      }));
      
      const { error } = await supabase
        .from('quotes')
        .insert({
          email: localEmail || null,
          phone: localPhone || null,
          property_type: quoteData.propertyType,
          rooms: quoteData.rooms as any,
          devices: devicesWithProducts as any,
          subtotal: productSubtotal,
          installation_fee: installationFee,
          total: total,
          status: 'submitted',
        });

      if (error) throw error;

      toast({
        title: isRTL ? 'تم حفظ العرض!' : 'Quote Saved!',
        description: isRTL 
          ? 'سيتواصل معك فريقنا قريباً'
          : 'Our team will contact you soon',
      });

      // Open WhatsApp
      const whatsappMessage = encodeURIComponent(
        `🏠 Smart Home Quote Request\n\n` +
        `Property: ${propertyType}\n` +
        `Rooms: ${rooms.length}\n` +
        `Products: ${matchedProducts.length}\n` +
        `Total: ${formatPrice(total)}\n\n` +
        `Contact: ${localEmail || localPhone}`
      );
      window.open(`https://wa.me/201050627310?text=${whatsappMessage}`, '_blank');

    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء حفظ العرض' : 'Failed to save quote',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    
    const quoteText = `
SMART HOME QUOTATION
=====================

Property Type: ${propertyType?.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

ROOMS & PRODUCTS
----------------
${rooms.map(room => {
  const roomProducts = productsByRoom[room.id] || [];
  return `
${room.name}:
${roomProducts.map(mp => `  - ${mp.product.name}: ${formatPrice(mp.product.price)} x ${mp.quantity}`).join('\n')}
`;
}).join('')}

SUMMARY
-------
Products: ${formatPrice(productSubtotal)}
Installation: ${formatPrice(installationFee)}
TOTAL: ${formatPrice(total)}

Contact: ${localEmail || localPhone || 'Not provided'}
    `.trim();

    const blob = new Blob([quoteText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-home-quote-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setIsGeneratingPDF(false);
    
    toast({
      title: isRTL ? 'تم تحميل العرض' : 'Quote Downloaded',
      description: isRTL ? 'تم حفظ ملف العرض' : 'Quote file has been saved',
    });
  };

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          {isRTL ? 'جاري البحث عن المنتجات...' : 'Finding matching products...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-3"
        >
          Step 4 of 4
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl md:text-4xl font-bold"
        >
          {isRTL ? 'عرض السعر الخاص بك' : 'Your Smart Home Quote'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mt-3"
        >
          {isRTL 
            ? 'منتجات حقيقية من متجرنا مطابقة لاحتياجاتك'
            : 'Real products from our store matched to your needs'
          }
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products by Room */}
        <div className="lg:col-span-2 space-y-4">
          {rooms.map((room, index) => {
            const roomInfo = ROOM_TYPES.find(rt => rt.type === room.type);
            const roomProducts = productsByRoom[room.id] || [];
            const roomTotal = roomProducts.reduce((sum, mp) => sum + mp.product.price * mp.quantity, 0);

            if (roomProducts.length === 0) return null;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{roomInfo?.icon}</span>
                    <h4 className="font-medium">{room.name}</h4>
                  </div>
                  <span className="font-bold text-primary">{formatPrice(roomTotal)}</span>
                </div>
                
                <div className="space-y-3">
                  {roomProducts.map((mp) => {
                    const featureInfo = FEATURE_TYPES.find(ft => ft.type === mp.featureType);
                    return (
                      <div key={`${mp.product.id}-${mp.roomId}`} className="flex items-center gap-3">
                        {/* Product Image */}
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {mp.product.image_url ? (
                            <img 
                              src={mp.product.image_url} 
                              alt={mp.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mp.product.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>{featureInfo?.icon}</span>
                            <span>{isRTL ? featureInfo?.nameAr : featureInfo?.nameEn}</span>
                            {mp.quantity > 1 && <span>x{mp.quantity}</span>}
                          </p>
                        </div>
                        
                        <span className="text-sm font-medium">
                          {formatPrice(mp.product.price * mp.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}

          {matchedProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isRTL ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}</p>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl border-2 border-primary bg-primary/5"
          >
            <h3 className="font-display text-xl font-bold mb-4">
              {isRTL ? 'ملخص التكلفة' : 'Cost Summary'}
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {isRTL ? 'المنتجات' : 'Products'} ({matchedProducts.length})
                </span>
                <span>{formatPrice(productSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isRTL ? 'التركيب' : 'Installation'}</span>
                <span>{formatPrice(installationFee)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-bold text-lg">{isRTL ? 'الإجمالي' : 'Total'}</span>
                <span className="font-bold text-lg text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full gap-2 mb-3"
              size="lg"
              onClick={handleAddAllToCart}
              disabled={isAddingToCart || matchedProducts.length === 0}
            >
              {isAddingToCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {isRTL ? 'إضافة الكل للسلة' : 'Add All to Cart'}
            </Button>

            <div className="text-center text-xs text-muted-foreground mb-4">
              {isRTL ? 'أو احفظ العرض للتواصل لاحقاً' : 'Or save quote for later contact'}
            </div>

            {/* Contact Form */}
            <div className="space-y-3 mb-4">
              <div>
                <Label htmlFor="email" className="text-xs">
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">
                  {isRTL ? 'رقم الهاتف' : 'Phone'}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSaveQuote}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isRTL ? 'إرسال العرض' : 'Submit Quote'}
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isRTL ? 'تحميل PDF' : 'Download PDF'}
              </Button>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={reset}
          >
            {isRTL ? 'بدء مشروع جديد' : 'Start New Quote'}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-start pt-4">
        <Button
          variant="outline"
          onClick={() => setStep(3)}
          className="gap-2"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'تعديل الغرف' : 'Edit Rooms'}
        </Button>
      </div>
    </div>
  );
}
