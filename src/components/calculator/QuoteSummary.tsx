import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Send, FileText, Phone, Mail, Loader2 } from 'lucide-react';
import { useCalculator } from '@/hooks/useCalculator';
import { ROOM_TYPES, FEATURE_TYPES } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function QuoteSummary() {
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
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [localEmail, setLocalEmail] = useState(email);
  const [localPhone, setLocalPhone] = useState(phone);

  const subtotal = getSubtotal();
  const installationFee = getInstallationFee();
  const total = getTotal();

  // Group devices by room
  const devicesByRoom = devices.reduce((acc, device) => {
    if (!acc[device.roomId]) {
      acc[device.roomId] = [];
    }
    acc[device.roomId].push(device);
    return acc;
  }, {} as Record<string, typeof devices>);

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
        title: isRTL ? 'تم حفظ العرض!' : 'Quote Saved!',
        description: isRTL 
          ? 'سيتواصل معك فريقنا قريباً'
          : 'Our team will contact you soon',
      });

      // Open WhatsApp with quote summary
      const whatsappMessage = encodeURIComponent(
        `🏠 Smart Home Quote Request\n\n` +
        `Property: ${propertyType}\n` +
        `Rooms: ${rooms.length}\n` +
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

    try {
      // Fetch logo from admin settings
      const { data: logoSetting } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'logo_url')
        .maybeSingle();
      const logoUrl = logoSetting?.value || null;

      const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      const rowsHtml = rooms.map(room => {
        const roomDevices = devicesByRoom[room.id] || [];
        if (!roomDevices.length) return '';
        const roomTotal = roomDevices.reduce((s, d) => s + d.price * d.quantity, 0);
        const deviceRows = roomDevices.map(d => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${d.productName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${d.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(d.price)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(d.price * d.quantity)}</td>
          </tr>`).join('');
        return `
          <tr><td colspan="4" style="padding:12px;background:#f8fafc;font-weight:700;font-size:14px;color:#1a1a1a;">
            ${room.name} — ${formatPrice(roomTotal)}
          </td></tr>
          ${deviceRows}`;
      }).join('');

      const html = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>${isRTL ? 'عرض سعر المنزل الذكي' : 'Smart Home Quotation'}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: ${isRTL ? "'Segoe UI','Tahoma',Arial,sans-serif" : "Arial,'Helvetica Neue',sans-serif"}; color:#1a1a1a; background:#fff; }
    .page { max-width:800px; margin:0 auto; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:3px solid #0ea5e9; margin-bottom:28px; }
    .logo img { max-height:60px; max-width:180px; object-fit:contain; }
    .logo-text { font-size:24px; font-weight:800; color:#0ea5e9; letter-spacing:-0.5px; }
    .header-right { text-align:${isRTL ? 'left' : 'right'}; }
    .quote-title { font-size:22px; font-weight:700; color:#0ea5e9; margin-bottom:4px; }
    .quote-meta { font-size:13px; color:#666; }
    .section-title { font-size:16px; font-weight:700; margin:24px 0 10px; color:#0ea5e9; text-transform:uppercase; letter-spacing:0.05em; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    thead tr { background:#0ea5e9; color:#fff; }
    thead th { padding:10px 12px; text-align:left; font-size:13px; font-weight:600; }
    thead th:last-child,thead th:nth-child(2),thead th:nth-child(3) { text-align:right; }
    tbody tr:hover { background:#f8fafc; }
    .summary-box { background:#f0f9ff; border:2px solid #0ea5e9; border-radius:10px; padding:20px 28px; margin-top:24px; }
    .summary-row { display:flex; justify-content:space-between; padding:6px 0; font-size:15px; color:#444; }
    .summary-total { display:flex; justify-content:space-between; padding:12px 0 0; margin-top:8px; border-top:2px solid #0ea5e9; font-size:20px; font-weight:800; color:#0ea5e9; }
    .contact-box { margin-top:24px; padding:16px; background:#f8fafc; border-radius:8px; font-size:13px; color:#555; }
    .footer { margin-top:36px; padding-top:16px; border-top:1px solid #e0e0e0; font-size:12px; color:#999; text-align:center; }
    @media print { .page { padding:20px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : '<div class="logo-text">Baytzaki</div>'}
      </div>
      <div class="header-right">
        <div class="quote-title">${isRTL ? 'عرض سعر المنزل الذكي' : 'Smart Home Quotation'}</div>
        <div class="quote-meta">${isRTL ? 'تاريخ:' : 'Date:'} ${dateStr}</div>
        <div class="quote-meta">${isRTL ? 'نوع العقار:' : 'Property:'} ${propertyType || '—'}</div>
      </div>
    </div>

    <div class="section-title">${isRTL ? 'تفاصيل الأجهزة' : 'Device Breakdown'}</div>
    <table>
      <thead>
        <tr>
          <th>${isRTL ? 'الجهاز' : 'Device'}</th>
          <th style="text-align:center;">${isRTL ? 'الكمية' : 'Qty'}</th>
          <th style="text-align:right;">${isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
          <th style="text-align:right;">${isRTL ? 'الإجمالي' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="summary-box">
      <div class="summary-row"><span>${isRTL ? 'الأجهزة' : 'Devices'}</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>${isRTL ? 'التركيب والبرمجة' : 'Installation & Setup'}</span><span>${formatPrice(installationFee)}</span></div>
      <div class="summary-total"><span>${isRTL ? 'الإجمالي الكلي' : 'Grand Total'}</span><span>${formatPrice(total)}</span></div>
    </div>

    ${(localEmail || localPhone) ? `
    <div class="contact-box">
      <strong>${isRTL ? 'معلومات التواصل' : 'Contact Info'}:</strong>
      ${localEmail ? `&nbsp; ${localEmail}` : ''}${localPhone ? `&nbsp;&nbsp;|&nbsp;&nbsp; ${localPhone}` : ''}
    </div>` : ''}

    <div class="footer">
      baytzaki.com &nbsp;·&nbsp; ${isRTL ? 'عرض السعر صالح لمدة ٣٠ يوماً' : 'Quotation valid for 30 days'} &nbsp;·&nbsp; ${dateStr}
    </div>
  </div>
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

      const win = window.open('', '_blank', 'width=900,height=700');
      if (win) {
        win.document.write(html);
        win.document.close();
      }

      toast({
        title: isRTL ? 'جاهز للطباعة كـ PDF' : 'Ready to print as PDF',
        description: isRTL ? 'اختر "حفظ كـ PDF" في نافذة الطباعة' : 'Choose "Save as PDF" in the print dialog',
      });
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
            ? 'مراجعة شاملة لمشروع منزلك الذكي'
            : 'Complete breakdown of your smart home project'
          }
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Devices by Room */}
        <div className="lg:col-span-2 space-y-4">
          {rooms.map((room, index) => {
            const roomInfo = ROOM_TYPES.find(rt => rt.type === room.type);
            const roomDevices = devicesByRoom[room.id] || [];
            const roomTotal = roomDevices.reduce((sum, d) => sum + d.price * d.quantity, 0);

            if (roomDevices.length === 0) return null;

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
                
                <div className="space-y-2">
                  {roomDevices.map((device) => {
                    const featureInfo = FEATURE_TYPES.find(ft => ft.type === device.featureType);
                    return (
                      <div key={device.productId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{featureInfo?.icon}</span>
                          <span>{isRTL ? featureInfo?.nameAr : device.productName}</span>
                          {device.quantity > 1 && (
                            <span className="text-muted-foreground">x{device.quantity}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatPrice(device.price * device.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
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
                <span className="text-muted-foreground">{isRTL ? 'الأجهزة' : 'Devices'}</span>
                <span>{formatPrice(subtotal)}</span>
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
                variant="outline"
                className="w-full gap-2"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
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
