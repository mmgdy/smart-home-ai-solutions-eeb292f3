import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Send, 
  ShoppingCart, 
  Phone, 
  Mail, 
  User,
  Loader2, 
  Package, 
  ShieldCheck, 
  Wrench, 
  Calendar, 
  Hash, 
  Network,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '@/hooks/useCalculator';
import { ROOM_TYPES, DeviceRecommendation } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { useCart } from '@/hooks/useCart';
import { Product } from '@/types/store';
import defaultLogoImage from '@/assets/logo.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

async function getBase64FromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to load logo for PDF:', e);
    return null;
  }
}

export function QuoteSummaryWithCart() {
  const navigate = useNavigate();
  const { get: getInfo } = useSiteInfo();
  const rawWa = (getInfo('contact', 'whatsapp', '01501896456') || '01501896456').replace(/\D/g, '');
  const whatsappNumber = rawWa.startsWith('0') ? '2' + rawWa : rawWa;

  const { 
    rooms, 
    devices, 
    quoteNumber,
    quoteDate,
    customerName,
    email,
    phone,
    propertyType,
    presetTemplate,
    wiringType,
    getSubtotal, 
    getInstallationFee, 
    getTotal,
    setStep,
    setContactInfo,
    getQuoteData,
    reset,
  } = useCalculator();

  const { isRTL, formatPrice } = useLanguage();
  const { toast } = useToast();
  const { addItem } = useCart();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [localName, setLocalName] = useState(customerName || '');
  const [localEmail, setLocalEmail] = useState(email || '');
  const [localPhone, setLocalPhone] = useState(phone || '');
  const [cachedProducts, setCachedProducts] = useState<Record<string, Product>>({});
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoImage);

  // Fetch logo and live products from database
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch official logo from admin settings
        const { data: logoSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'logo_url')
          .maybeSingle();

        if (logoSetting?.value) {
          setLogoUrl(logoSetting.value);
        }

        // 2. Fetch full product records for cart
        const productIds = Array.from(new Set(devices.map(d => d.productId)));
        if (productIds.length > 0) {
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);

          if (prods) {
            const map: Record<string, Product> = {};
            prods.forEach((p: any) => {
              map[p.id] = {
                ...p,
                images: p.images || [],
                specifications: p.specifications || {},
              } as Product;
            });
            setCachedProducts(map);
          }
        }
      } catch (err) {
        console.error('Error loading quote assets:', err);
      }
    }

    loadData();
  }, [devices]);

  const subtotal = getSubtotal();
  const installationFee = getInstallationFee();
  const grandTotal = getTotal();
  const totalDeviceCount = devices.reduce((sum, d) => sum + d.quantity, 0);

  // Group devices by room
  const devicesByRoom = devices.reduce((acc, device) => {
    const key = device.roomId;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(device);
    return acc;
  }, {} as Record<string, DeviceRecommendation[]>);

  // Format Dates
  const issueDateObj = quoteDate ? new Date(quoteDate) : new Date();
  const validUntilObj = new Date(issueDateObj.getTime() + 15 * 24 * 60 * 60 * 1000);

  const issueDateStr = issueDateObj.toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const validUntilStr = validUntilObj.toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleAddAllToCart = async () => {
    setIsAddingToCart(true);
    try {
      let count = 0;
      devices.forEach((dev) => {
        const prod = cachedProducts[dev.productId] || ({
          id: dev.productId,
          name: dev.productName,
          slug: dev.productSlug || 'product',
          price: dev.price,
          original_price: null,
          category_id: null,
          image_url: dev.imageUrl || null,
          images: dev.imageUrl ? [dev.imageUrl] : [],
          brand: dev.brand || 'SONOFF',
          protocol: dev.protocol || null,
          specifications: {},
          stock: 15,
          featured: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Product);

        addItem(prod, dev.quantity);
        count += dev.quantity;
      });

      toast({
        title: isRTL ? 'تمت الإضافة إلى سلة التسوق!' : 'Added to Cart Successfully!',
        description: isRTL 
          ? `تم إضافة ${count} قطعة مطابقة للمواصفات إلى سلة التسوق`
          : `Added ${count} items matching your quote to cart`,
      });

      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء إضافة المنتجات للسلة' : 'Failed to add products to cart',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!localPhone && !localEmail) {
      toast({
        title: isRTL ? 'مطلوب وسيلة اتصال' : 'Contact Info Required',
        description: isRTL 
          ? 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني لحفظ العرض'
          : 'Please enter phone or email to save your quote',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setContactInfo(localName, localEmail, localPhone);

    try {
      const quoteData = getQuoteData();
      
      const { error } = await supabase
        .from('quotes')
        .insert({
          email: localEmail || null,
          phone: localPhone || null,
          property_type: quoteData.propertyType,
          rooms: quoteData.rooms as any,
          devices: quoteData.devices as any,
          subtotal: quoteData.subtotal,
          installation_fee: quoteData.installationFee,
          total: quoteData.total,
          status: 'submitted',
        });

      if (error) throw error;

      toast({
        title: isRTL ? 'تم تسجيل وحفظ عرض السعر بنجاح!' : 'Quote Saved Successfully!',
        description: isRTL 
          ? `رقم العرض: ${quoteNumber} • سيتواصل معك مهندس معتمد قريباً`
          : `Reference: ${quoteNumber} • A certified engineer will contact you shortly`,
      });

      // Send to WhatsApp
      handleWhatsAppShare();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: isRTL ? 'تنبيه' : 'Notice',
        description: isRTL ? 'تم تجهيز العرض وسنفتحه عبر واتساب' : 'Opening quote via WhatsApp',
      });
      handleWhatsAppShare();
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsAppShare = () => {
    const propertyLabel = PROPERTY_TYPES_LABEL[propertyType || 'apartment'] || propertyType;
    const message = encodeURIComponent(
      `🏠 *طلب عرض سعر منزل ذكي - AzkaSmart*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *رقم العرض:* ${quoteNumber}\n` +
      `📅 *تاريخ الإصدار:* ${issueDateStr}\n` +
      `⏳ *الصلاحية:* ١٥ يوماً حتى ${validUntilStr}\n` +
      `🏢 *نوع العقار:* ${propertyLabel}\n` +
      `🚪 *عدد الغرف والمناطق:* ${rooms.length} غرف\n` +
      `📦 *إجمالي الأجهزة والقطع:* ${totalDeviceCount} جهاز\n` +
      `⚡ *التأسيس الكهربائي:* ${wiringType === 'no_neutral' ? 'بدون نيوترال (No-Neutral)' : 'نيوترال متوفر'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *قيمة الأجهزة والمعدات:* ${formatPrice(subtotal)}\n` +
      `🛠️ *التركيب والبرمجة والضمان (٢٠٪، حد أدنى ١٥٠٠ ج.م):* ${formatPrice(installationFee)}\n` +
      `🌟 *الإجمالي الاستثماري الكلي:* ${formatPrice(grandTotal)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *بيانات العميل:* ${localName || 'عميل كريم'}\n` +
      `📞 *رقم الهاتف:* ${localPhone || 'غير محدد'}\n` +
      `✉️ *البريد:* ${localEmail || 'غير محدد'}\n\n` +
      `متاح للتواصل والمتابعة لتحديد موعد المعاينة الهندسية 🇪🇬`
    );

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const PROPERTY_TYPES_LABEL: Record<string, string> = {
    apartment: 'شقة سكنية (Apartment)',
    villa: 'فيلا مستقلة (Villa)',
    duplex: 'دوبلكس / بنتهاوس (Duplex)',
    office: 'مكتب تجاري / إداري (Office)',
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // Try loading logo base64
      let logoBase64: string | null = null;
      try {
        logoBase64 = await getBase64FromUrl(logoUrl);
      } catch (e) {
        console.warn('Could not convert logo to base64, using fallback graphic:', e);
      }

      // Top Accent Header Bar (AzkaSmart Slate & Teal)
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 90, 'F');

      doc.setFillColor(13, 148, 136); // teal-600
      doc.rect(0, 86, pageWidth, 4, 'F');

      // Add Logo image or vector branding
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin, 18, 120, 50, undefined, 'FAST');
        } catch (imgErr) {
          console.warn('doc.addImage failed, falling back to vector text:', imgErr);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.text('AzkaSmart', margin, 46);
        }
      } else {
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('AzkaSmart', margin, 46);
        doc.setFontSize(10);
        doc.setTextColor(204, 251, 241);
        doc.text('Smart Home & Access Control Solutions', margin, 64);
      }

      // Header Right (Quote Meta)
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('OFFICIAL SMART HOME QUOTATION', pageWidth - margin, 34, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`Quote Ref: ${quoteNumber}`, pageWidth - margin, 50, { align: 'right' });
      doc.text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, 64, { align: 'right' });
      doc.text(`Validity: 15 Days`, pageWidth - margin, 77, { align: 'right' });

      // Customer & Project Info Box
      let y = 112;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(margin, y, contentWidth, 58, 6, 6, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('CLIENT & PROJECT DETAILS', margin + 14, y + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      const col1X = margin + 14;
      const col2X = margin + contentWidth * 0.35;
      const col3X = margin + contentWidth * 0.70;

      doc.text(`Client: ${localName || 'Valued Client'}`, col1X, y + 34);
      doc.text(`Phone: ${localPhone || 'Not specified'}`, col1X, y + 48);

      doc.text(`Email: ${localEmail || 'Not specified'}`, col2X, y + 34);
      doc.text(`Property: ${(propertyType || 'Apartment').toUpperCase()}`, col2X, y + 48);

      doc.text(`Zones / Rooms: ${rooms.length}`, col3X, y + 34);
      doc.text(`Total Devices: ${totalDeviceCount} Units`, col3X, y + 48);

      y += 74;

      // Build Table Data
      const tableBody: any[] = [];

      // 1. Grouped Rooms
      rooms.forEach((room) => {
        const roomDevs = devicesByRoom[room.id] || [];
        if (roomDevs.length === 0) return;

        const roomSum = roomDevs.reduce((s, d) => s + d.price * d.quantity, 0);

        // Section header row
        tableBody.push([
          { 
            content: `${room.name}  —  Zone Total: ${roomSum.toLocaleString()} EGP`, 
            colSpan: 4, 
            styles: { 
              fillColor: [240, 253, 250], 
              textColor: [13, 148, 136], 
              fontStyle: 'bold', 
              fontSize: 9.5 
            } 
          }
        ]);

        roomDevs.forEach((d) => {
          tableBody.push([
            d.productName,
            (d.protocol || 'Wi-Fi').toUpperCase(),
            String(d.quantity),
            `${(d.price * d.quantity).toLocaleString()} EGP`
          ]);
        });
      });

      // 2. Central Coordinator (if present)
      const coordinatorDev = devices.find(d => d.isCoordinator);
      if (coordinatorDev) {
        tableBody.push([
          { 
            content: `CENTRAL GATEWAY & COORDINATOR  —  ${coordinatorDev.price.toLocaleString()} EGP`, 
            colSpan: 4, 
            styles: { 
              fillColor: [254, 243, 199], 
              textColor: [180, 83, 9], 
              fontStyle: 'bold', 
              fontSize: 9.5 
            } 
          }
        ]);
        tableBody.push([
          coordinatorDev.productName,
          'ZIGBEE 3.0 MESH HUB',
          '1',
          `${coordinatorDev.price.toLocaleString()} EGP`
        ]);
      }

      // Render Table
      autoTable(doc, {
        startY: y,
        head: [['Device Description', 'Protocol', 'Qty', 'Line Total']],
        body: tableBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [15, 23, 42], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 9.5,
          cellPadding: 6
        },
        styles: { 
          fontSize: 8.5, 
          cellPadding: 5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.54 },
          1: { cellWidth: contentWidth * 0.18, halign: 'center' },
          2: { cellWidth: contentWidth * 0.10, halign: 'center' },
          3: { cellWidth: contentWidth * 0.18, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });

      let finalY = (doc as any).lastAutoTable.finalY + 16;

      // Check if summary fits on current page
      if (finalY + 130 > pageHeight - 40) {
        doc.addPage();
        finalY = 40;
      }

      // Financial Summary Box
      const summaryWidth = 240;
      const summaryX = pageWidth - margin - summaryWidth;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(1.5);
      doc.roundedRect(summaryX, finalY, summaryWidth, 88, 6, 6, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Hardware Equipment:', summaryX + 12, finalY + 20);
      doc.text(`${subtotal.toLocaleString()} EGP`, summaryX + summaryWidth - 12, finalY + 20, { align: 'right' });

      doc.text('Certified Installation (20%, min 1500):', summaryX + 12, finalY + 38);
      doc.text(`${installationFee.toLocaleString()} EGP`, summaryX + summaryWidth - 12, finalY + 38, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.line(summaryX + 12, finalY + 48, summaryX + summaryWidth - 12, finalY + 48);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(13, 148, 136);
      doc.text('TOTAL INVESTMENT:', summaryX + 12, finalY + 68);
      doc.text(`${grandTotal.toLocaleString()} EGP`, summaryX + summaryWidth - 12, finalY + 68, { align: 'right' });

      // Warranty & Support Box on left side
      const noteWidth = contentWidth - summaryWidth - 16;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, finalY, noteWidth, 88, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL WARRANTY & TERMS:', margin + 12, finalY + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('• 1-Year Official Warranty on all hardware across Egypt.', margin + 12, finalY + 36);
      doc.text('• Professional onsite commissioning, scenes programming & app setup.', margin + 12, finalY + 48);
      doc.text('• 14-Day replacement guarantee against manufacturing defects.', margin + 12, finalY + 60);
      doc.text('• Quotation valid for 15 days from date of issuance.', margin + 12, finalY + 72);

      // Official Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
        doc.text(
          "AzkaSmart — Egypt's Premier Smart Home & Access Control Provider | azkasmart.com | WhatsApp: 01501896456",
          pageWidth / 2,
          pageHeight - 16,
          { align: 'center' }
        );
      }

      doc.save(`AzkaSmart-Quote-${quoteNumber}.pdf`);

      toast({
        title: isRTL ? 'تم تحميل عرض السعر بنجاح!' : 'PDF Quotation Downloaded!',
        description: isRTL ? `تم حفظ ملف ${quoteNumber}.pdf` : `Saved as AzkaSmart-Quote-${quoteNumber}.pdf`,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء إنشاء PDF' : 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border-2 border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-36 bg-slate-900 rounded-2xl p-2 flex items-center justify-center border border-border/40 shadow-inner">
              <img
                src={logoUrl}
                alt="AzkaSmart"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  AzkaSmart Engineering
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                  {isRTL ? 'معتمد' : 'Verified'}
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {isRTL ? 'المقايسة الفنية وعرض السعر الرسمي' : 'Official Smart Home Quotation'}
              </h2>
            </div>
          </div>

          {/* Quote Meta */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-mono font-bold text-foreground bg-muted px-3 py-1 rounded-lg">
              <Hash className="w-3.5 h-3.5 text-primary" />
              <span>{quoteNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{isRTL ? `تاريخ الإصدار: ${issueDateStr}` : `Date: ${issueDateStr}`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span>{isRTL ? `صالح حتى: ${validUntilStr} (١٥ يوماً)` : `Valid until: ${validUntilStr}`}</span>
            </div>
          </div>
        </div>

        {/* Project Snapshot Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground block">{isRTL ? 'نوع العقار' : 'Property'}</span>
            <span className="font-bold text-sm text-foreground uppercase mt-0.5 block">
              {propertyType}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground block">{isRTL ? 'المناطق والغرف' : 'Rooms & Zones'}</span>
            <span className="font-bold text-sm text-foreground mt-0.5 block">
              {rooms.length} {isRTL ? 'مناطق' : 'zones'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground block">{isRTL ? 'إجمالي الأجهزة' : 'Hardware Units'}</span>
            <span className="font-bold text-sm text-foreground mt-0.5 block">
              {totalDeviceCount} {isRTL ? 'قطع' : 'units'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground block">{isRTL ? 'التأسيس الكهربائي' : 'Wiring Setup'}</span>
            <span className="font-bold text-sm text-foreground mt-0.5 block">
              {wiringType === 'no_neutral' ? (isRTL ? 'بدون نيوترال' : 'No Neutral') : (isRTL ? 'نيوترال متوفر' : 'Neutral Wire')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: BOM on Left, Summary & Checkout on Right */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bill of Materials (BOM) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {isRTL ? 'قائمة المعدات والأجهزة (Bill of Materials)' : 'Bill of Materials (BOM)'}
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {isRTL ? 'مفصلة حسب كل منطقة' : 'Itemized by zone'}
            </span>
          </div>

          {rooms.map((room, index) => {
            const roomInfo = ROOM_TYPES.find(rt => rt.type === room.type);
            const roomDevices = devicesByRoom[room.id] || [];
            const roomTotal = roomDevices.reduce((sum, d) => sum + d.price * d.quantity, 0);

            if (roomDevices.length === 0) return null;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="p-5 rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{roomInfo?.icon}</span>
                    <div>
                      <h4 className="font-bold text-base text-foreground">{room.name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {roomDevices.length} {isRTL ? 'أنواع أجهزة' : 'types'}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-base text-primary">
                    {formatPrice(roomTotal)}
                  </span>
                </div>

                <div className="space-y-3">
                  {roomDevices.map((dev) => (
                    <div 
                      key={`${dev.productId}-${dev.roomId}`}
                      className="flex items-center justify-between gap-3 text-sm p-2 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-white p-1 border border-border/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {dev.imageUrl ? (
                            <img src={dev.imageUrl} alt={dev.productName} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">
                            {dev.productName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 bg-muted rounded">
                              {dev.protocol || 'Wi-Fi'}
                            </span>
                            <span>{formatPrice(dev.price)} × {dev.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-foreground">
                          {formatPrice(dev.price * dev.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Central Coordinator Row */}
          {devices.some(d => d.isCoordinator) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 shadow-sm"
            >
              {devices.filter(d => d.isCoordinator).map(coord => (
                <div key={coord.productId} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white p-1 border border-amber-500/30 flex items-center justify-center overflow-hidden">
                      <img src={coord.imageUrl} alt={coord.productName} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-amber-600" />
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                          {isRTL ? 'وحدة التحكم المركزية (مضافة تلقائياً)' : 'Central Coordinator (Auto-Added)'}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-sm mt-0.5">{coord.productName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRTL ? 'مطلوب لربط حساسات وشبكة زيجبي اللاسلكية' : 'Required to bridge wireless Zigbee mesh'}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-foreground text-base">
                    {formatPrice(coord.price)}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Financial Summary & Actions Sticky Panel */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl border-2 border-primary bg-primary/5 shadow-lg space-y-6"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-xl font-bold text-foreground">
                {isRTL ? 'الملخص المالي للاستثمار' : 'Financial Investment'}
              </h3>
              <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                EGP
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  {isRTL ? 'إجمالي الأجهزة والمعدات' : 'Hardware Subtotal'} ({totalDeviceCount})
                </span>
                <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between items-start">
                <div className="text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-primary" />
                    {isRTL ? 'التركيب والبرمجة الهندسية' : 'Certified Installation'}
                  </span>
                  <span className="text-[11px] text-muted-foreground/80 block mt-0.5">
                    {isRTL ? '٢٠٪ من قيمة المعدات (حد أدنى ١٥٠٠ ج.م)' : '20% of hardware (min. 1,500 EGP)'}
                  </span>
                </div>
                <span className="font-semibold text-foreground">{formatPrice(installationFee)}</span>
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-baseline">
                <div>
                  <span className="font-display font-bold text-lg text-foreground block">
                    {isRTL ? 'الإجمالي الكلي' : 'Grand Total'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isRTL ? 'شامل الضمان والدعم الفني' : 'Incl. warranty & setup'}
                  </span>
                </div>
                <span className="font-display font-extrabold text-2xl text-primary">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>{isRTL ? 'ضمان رسمي معتمد لمدة عام كامل' : '1-Year Official Warranty in Egypt'}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{isRTL ? 'برمجة وتطبيق السيناريوهات الذكية' : 'Full automation scene programming'}</span>
              </div>
            </div>

            {/* Direct Cart Action */}
            <Button
              className="w-full gap-2 font-bold text-base h-12 shadow-lg shadow-primary/25"
              size="lg"
              onClick={handleAddAllToCart}
              disabled={isAddingToCart || devices.length === 0}
            >
              {isAddingToCart ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
              {isRTL ? 'إضافة كل الأجهزة إلى سلة التسوق' : 'Add All to Store Cart'}
            </Button>

            {/* Contact Details Form */}
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isRTL ? 'بيانات التواصل لاعتماد العرض' : 'Contact Details'}
              </span>

              <div>
                <Label htmlFor="c-name" className="text-xs">{isRTL ? 'الاسم الكريم' : 'Full Name'}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="c-name"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder={isRTL ? 'اسم العميل' : 'Your Name'}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="c-phone" className="text-xs">{isRTL ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="c-phone"
                    type="tel"
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="c-email" className="text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="c-email"
                    type="email"
                    value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                className="gap-1.5 text-xs h-10 border-primary/40 hover:bg-primary/10"
                onClick={handleSaveQuote}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
                {isRTL ? 'إرسال واتساب' : 'WhatsApp'}
              </Button>

              <Button
                variant="outline"
                className="gap-1.5 text-xs h-10 border-border hover:bg-card"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isRTL ? 'تحميل PDF' : 'Download PDF'}
              </Button>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={reset}
          >
            {isRTL ? 'بدء مشروع جديد / إعادة ضبط' : 'Start New Project'}
          </Button>
        </div>
      </div>

      {/* Navigation Back */}
      <div className="flex justify-start pt-4">
        <Button
          variant="outline"
          onClick={() => setStep(3)}
          className="gap-2"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'العودة لتعديل أجهزة الغرف' : 'Edit Rooms & Devices'}
        </Button>
      </div>
    </div>
  );
}
