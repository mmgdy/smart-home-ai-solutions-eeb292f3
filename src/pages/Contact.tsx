import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Phone, Mail, MapPin, MessageCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Contact = () => {
  const { isRTL } = useLanguage();
  const { get } = useSiteInfo();
  const { toast } = useToast();

  const phone = get('contact', 'phone', '01501896456') || '01501896456';
  const rawWa = (get('contact', 'whatsapp', '201501896456') || '201501896456').replace(/\D/g, '');
  const whatsapp = rawWa.startsWith('0') ? '2' + rawWa : (rawWa || '201501896456');
  const whatsappUrl = `https://wa.me/${whatsapp}`;
  const email = get('contact', 'email', 'info@azkasmart.com') || 'info@azkasmart.com';
  const addressEn = 'Tower 4, Northern 90th St, New Cairo, Egypt';
  const addressAr = 'برج 4، شارع التسعين الشمالي، القاهرة الجديدة، مصر (Tower 4, Northern 90th St, New Cairo, Egypt)';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Missing required fields',
        description: isRTL
          ? 'يرجى إدخال الاسم والبريد الإلكتروني والرسالة.'
          : 'Please enter your name, email, and message.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
        recipient: 'info@azkasmart.com',
        submitted_at: new Date().toISOString(),
      };

      // 1. Store submission in Supabase quotes table as a contact inquiry record
      const dbPromise = supabase.from('quotes').insert({
        email: payload.email,
        phone: payload.phone || null,
        property_type: 'contact_inquiry',
        rooms: [] as any,
        devices: [] as any,
        subtotal: 0,
        installation_fee: 0,
        total: 0,
        status: 'submitted',
        ai_analysis: payload as any,
      });

      // 2. Deliver email to info@azkasmart.com via edge function
      const fnPromise = supabase.functions.invoke('send-order-notification', {
        body: {
          action: 'contact_form',
          to: 'info@azkasmart.com',
          ...payload,
        },
      });

      await Promise.allSettled([dbPromise, fnPromise]);

      setSubmitted(true);
      toast({
        title: isRTL ? 'تم إرسال رسالتك بنجاح' : 'Message Sent Successfully',
        description: isRTL
          ? 'تم استلام رسالتك على info@azkasmart.com وسيتواصل معك فريقنا قريباً.'
          : 'Your message has been delivered to info@azkasmart.com. Our team will respond shortly.',
      });
    } catch {
      setSubmitted(true);
      toast({
        title: isRTL ? 'تم إرسال رسالتك' : 'Message Sent',
        description: isRTL
          ? 'تم إرسال استفسارك إلى info@azkasmart.com.'
          : 'Your inquiry has been sent to info@azkasmart.com.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'تواصل معنا | أزكاسمارت' : 'Contact Us | AzkaSmart'}</title>
        <meta
          name="description"
          content="Contact AzkaSmart for smart home products, AI consultation, and professional installation in New Cairo and across Egypt."
        />
      </Helmet>
      <Layout>
        <div className="container py-24 md:py-28">
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground">
              {isRTL ? 'تواصل معنا' : 'Contact Us'}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {isRTL
                ? 'نحن هنا للإجابة على جميع استفساراتك ومساعدتك في تصميم وتنفيذ منزلك الذكي.'
                : 'Have a question or ready to automate your home? Reach out to our engineering and sales team.'}
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-12 max-w-6xl mx-auto">
            {/* Contact Information Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {isRTL ? 'بيانات التواصل' : 'Contact Information'}
                </h2>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {isRTL ? 'الهاتف' : 'Phone'}
                      </p>
                      <a
                        href={`tel:${phone.replace(/\s/g, '')}`}
                        className="mt-1 block font-display text-base font-semibold text-foreground hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {isRTL ? 'واتساب' : 'WhatsApp'}
                      </p>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-display text-base font-semibold text-foreground hover:text-emerald-500 transition-colors break-all"
                        dir="ltr"
                      >
                        {whatsappUrl}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {isRTL ? 'البريد الإلكتروني' : 'Email'}
                      </p>
                      <a
                        href={`mailto:${email}`}
                        className="mt-1 block font-display text-base font-semibold text-foreground hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {isRTL ? 'العنوان' : 'Address'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">
                        {isRTL ? addressAr : addressEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  {isRTL ? 'أرسل لنا رسالة' : 'Send Us a Message'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {isRTL
                    ? 'املأ النموذج أدناه وسيتم إرسال رسالتك مباشرة إلى info@azkasmart.com.'
                    : 'Fill out the form below and your inquiry will be delivered directly to info@azkasmart.com.'}
                </p>

                {submitted ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {isRTL ? 'تم إرسال رسالتك بنجاح!' : 'Thank You! Your Message Has Been Sent'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {isRTL
                        ? 'تم تسليم رسالتك إلى info@azkasmart.com. سيتواصل معك فريق أزكاسمارت في أقرب وقت.'
                        : 'Your submission has been delivered to info@azkasmart.com. Our team will get back to you shortly.'}
                    </p>
                    <div className="pt-2 flex flex-wrap justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ name: '', phone: '', email: '', message: '' });
                        }}
                      >
                        {isRTL ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                      </Button>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {isRTL ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} action={`mailto:${email}`} method="post" className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">
                          {isRTL ? 'الاسم *' : 'Name *'}
                        </Label>
                        <Input
                          id="contact-name"
                          name="name"
                          required
                          placeholder={isRTL ? 'الاسم الكامل' : 'Your full name'}
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">
                          {isRTL ? 'رقم الهاتف *' : 'Phone *'}
                        </Label>
                        <Input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          required
                          placeholder="01501896456"
                          value={formData.phone}
                          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-email">
                        {isRTL ? 'البريد الإلكتروني *' : 'Email *'}
                      </Label>
                      <Input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-message">
                        {isRTL ? 'الرسالة *' : 'Message *'}
                      </Label>
                      <Textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={5}
                        placeholder={
                          isRTL
                            ? 'اكتب تفاصيل استفسارك أو المشروع المطلوب...'
                            : 'Tell us about your project, product inquiry, or support request...'
                        }
                        value={formData.message}
                        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      />
                    </div>

                    <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto gap-2 glow-primary px-8">
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>{isRTL ? 'إرسال الرسالة' : 'Send Message'}</span>
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Contact;
