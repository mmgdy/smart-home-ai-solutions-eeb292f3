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
    
    // Create a simple text-based quote for now
    const quoteText = `
SMART HOME QUOTATION
=====================

Property Type: ${propertyType?.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

ROOMS & DEVICES
---------------
${rooms.map(room => {
  const roomDevices = devicesByRoom[room.id] || [];
  return `
${room.name}:
${roomDevices.map(d => `  - ${d.productName}: ${formatPrice(d.price)} x ${d.quantity}`).join('\n')}
`;
}).join('')}

SUMMARY
-------
Subtotal: ${formatPrice(subtotal)}
Installation: ${formatPrice(installationFee)}
TOTAL: ${formatPrice(total)}

Contact: ${localEmail || localPhone || 'Not provided'}
    `.trim();

    // Create and download text file
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
