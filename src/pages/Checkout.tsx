import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CreditCard, Banknote, Truck, Shield, Loader2, Gift, CheckCircle, LogIn, Wrench, Tag, X as XIcon, Copy, Check, Smartphone, UploadCloud, MessageCircle, Info } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PointsRedemption } from '@/components/loyalty/PointsRedemption';
import { useAuth } from '@/hooks/useAuth';
import { AuthButton } from '@/components/auth/AuthButton';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { CompatibilityCheck } from '@/components/checkout/CompatibilityCheck';
import { z } from 'zod';

const EGYPT_GOVERNORATES = [
  { en: 'Cairo', ar: 'القاهرة' },
  { en: 'Giza', ar: 'الجيزة' },
  { en: 'Alexandria', ar: 'الإسكندرية' },
  { en: 'Qalyubia', ar: 'القليوبية' },
  { en: 'Sharqia', ar: 'الشرقية' },
  { en: 'Dakahlia', ar: 'الدقهلية' },
  { en: 'Gharbia', ar: 'الغربية' },
  { en: 'Monufia', ar: 'المنوفية' },
  { en: 'Beheira', ar: 'البحيرة' },
  { en: 'Damietta', ar: 'دمياط' },
  { en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  { en: 'Port Said', ar: 'بورسعيد' },
  { en: 'Ismailia', ar: 'الإسماعيلية' },
  { en: 'Suez', ar: 'السويس' },
  { en: 'Fayoum', ar: 'الفيوم' },
  { en: 'Beni Suef', ar: 'بني سويف' },
  { en: 'Minya', ar: 'المنيا' },
  { en: 'Asyut', ar: 'أسيوط' },
  { en: 'Sohag', ar: 'سوهاج' },
  { en: 'Qena', ar: 'قنا' },
  { en: 'Luxor', ar: 'الأقصر' },
  { en: 'Aswan', ar: 'أسوان' },
  { en: 'Red Sea', ar: 'البحر الأحمر' },
  { en: 'New Valley', ar: 'الوادي الجديد' },
  { en: 'Matrouh', ar: 'مطروح' },
  { en: 'North Sinai', ar: 'شمال سيناء' },
  { en: 'South Sinai', ar: 'جنوب سيناء' },
];

// Validation schema
const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(20),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(200),
  city: z.string().trim().min(2, 'City must be at least 2 characters').max(100),
  governorate: z.string().trim().min(2, 'Governorate is required').max(100),
  notes: z.string().trim().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;


const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { get: getInfo } = useSiteInfo();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: 'percentage' | 'fixed'; discountValue: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'instapay' | 'cod'>('card');
  const [instapayReference, setInstapayReference] = useState('');
  const [instapayReceiptFile, setInstapayReceiptFile] = useState<File | null>(null);
  const [instapayReceiptPreview, setInstapayReceiptPreview] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paySkyCheckoutUrl, setPaySkyCheckoutUrl] = useState<string | null>(null);
  const [paySkyOrderId, setPaySkyOrderId] = useState<string | null>(null);
  const paySkyWindowRef = useRef<Window | null>(null);
  const [includeInstallation, setIncludeInstallation] = useState(true);

  const payskyEnabled = getInfo('payment', 'paysky_enabled', 'true') !== 'false';
  const instapayEnabled = getInfo('payment', 'instapay_enabled', 'true') !== 'false';
  const codEnabled = getInfo('payment', 'cod_enabled', 'true') !== 'false';

  useEffect(() => {
    if (paymentMethod === 'card' && !payskyEnabled) {
      if (instapayEnabled) setPaymentMethod('instapay');
      else if (codEnabled) setPaymentMethod('cod');
    } else if (paymentMethod === 'instapay' && !instapayEnabled) {
      if (payskyEnabled) setPaymentMethod('card');
      else if (codEnabled) setPaymentMethod('cod');
    } else if (paymentMethod === 'cod' && !codEnabled) {
      if (payskyEnabled) setPaymentMethod('card');
      else if (instapayEnabled) setPaymentMethod('instapay');
    }
  }, [payskyEnabled, instapayEnabled, codEnabled, paymentMethod]);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    governorate: 'Cairo',
    notes: '',
  });

  // Auto-fill email when user is logged in
  useEffect(() => {
    if (user?.email && !formData.email) {
      const fullName = user.user_metadata?.full_name || '';
      const nameParts = fullName.split(' ');
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: prev.firstName || nameParts[0] || '',
        lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
      }));
    }
  }, [user]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Listen for PaySky postMessage callbacks while the checkout iframe is open.
  useEffect(() => {
    if (!paySkyCheckoutUrl) return;

    const handleMessage = async (event: MessageEvent) => {
      if (!String(event.origin).includes('paysky.io')) return;
      const data = event.data;
      if (!data?.callback) return;

      if (data.callback === 'completeCallback') {
        window.removeEventListener('message', handleMessage);
        try { paySkyWindowRef.current?.close(); } catch {}
        setPaySkyCheckoutUrl(null);
        try {
          if (!paySkyOrderId) throw new Error('Missing order id');
          toast({
            title: language === 'ar' ? 'تم الدفع بنجاح' : 'Payment Successful',
            description: language === 'ar' ? 'تم إتمام طلبك بنجاح' : 'Your order has been placed successfully',
          });
          clearCart();
          navigate(`/order-confirmation?orderId=${paySkyOrderId}`);
        } catch (err: any) {
          toast({ variant: 'destructive', title: language === 'ar' ? 'خطأ' : 'Error', description: err.message });
        }
        setIsProcessing(false);
      } else if (data.callback === 'errorCallback') {
        window.removeEventListener('message', handleMessage);
        try { paySkyWindowRef.current?.close(); } catch {}
        setPaySkyCheckoutUrl(null);
        toast({ variant: 'destructive', title: language === 'ar' ? 'فشل الدفع' : 'Payment Failed', description: data.Info?.message || data.Info || 'Payment was not successful' });
        setIsProcessing(false);
      } else if (data.callback === 'cancelCallback') {
        window.removeEventListener('message', handleMessage);
        try { paySkyWindowRef.current?.close(); } catch {}
        setPaySkyCheckoutUrl(null);
        toast({ title: language === 'ar' ? 'تم إلغاء الدفع' : 'Payment Cancelled' });
        setIsProcessing(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [paySkyCheckoutUrl, paySkyOrderId]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const subtotal = getTotal();
  const shippingFlat = Number(getInfo('service_prices', 'shipping_flat', '50')) || 0;
  const shippingThreshold = Number(getInfo('service_prices', 'shipping_free_threshold', '1000')) || 0;
  const shippingCost = shippingThreshold > 0 && subtotal >= shippingThreshold ? 0 : shippingFlat;
  // Auto-calculated installation fee: 150 EGP per device, capped at 1500 EGP.
  const deviceCount = items.reduce((n, i) => n + i.quantity, 0);
  const installationFee = includeInstallation
    ? Math.min(1500, Math.max(0, deviceCount * 150))
    : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round(subtotal * appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, subtotal)
    : 0;
  const totalBeforeDiscount = subtotal + shippingCost + installationFee;
  const total = Math.max(0, totalBeforeDiscount - pointsDiscount - couponDiscount);

  const handleRedemptionChange = (discount: number, points: number) => {
    setPointsDiscount(discount);
    setPointsToRedeem(points);
  };

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'coupons')
        .eq('key', 'all_coupons')
        .maybeSingle();
      const coupons: any[] = data?.value ? JSON.parse(data.value) : [];
      const coupon = coupons.find((c) => c.code === code);

      if (!coupon || !coupon.is_active) {
        toast({ title: language === 'ar' ? 'كود غير صحيح' : 'Invalid coupon code', variant: 'destructive' });
        return;
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        toast({ title: language === 'ar' ? 'انتهت صلاحية الكود' : 'Coupon has expired', variant: 'destructive' });
        return;
      }
      if (coupon.min_order_amount > 0 && subtotal < coupon.min_order_amount) {
        toast({ title: language === 'ar' ? `الحد الأدنى للطلب: ${coupon.min_order_amount} EGP` : `Min order: ${coupon.min_order_amount} EGP`, variant: 'destructive' });
        return;
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast({ title: language === 'ar' ? 'تم استنفاد هذا الكود' : 'Coupon usage limit reached', variant: 'destructive' });
        return;
      }

      setAppliedCoupon({ code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value });
      const discLabel = coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} EGP`;
      toast({ title: language === 'ar' ? 'تم تطبيق الكود!' : 'Coupon applied!', description: `${discLabel} off` });
    } catch {
      toast({ title: language === 'ar' ? 'خطأ في التحقق' : 'Failed to validate coupon', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof CheckoutFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: language === 'ar' ? 'تم النسخ!' : 'Copied!',
        description: text,
      });
    } catch {
      toast({ title: text });
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'الملف كبير جداً' : 'File too large',
        description: language === 'ar' ? 'الحد الأقصى لحجم الملف هو 5 ميجابايت' : 'Maximum file size is 5MB',
      });
      return;
    }
    setInstapayReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setInstapayReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createOrder = async (status: string = 'pending', extraShippingData: Record<string, any> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id ?? null;
    const orderId = crypto.randomUUID();
    const paymentToken = crypto.randomUUID();

    // Create order in database
    const orderData = {
      id: orderId,
      email: formData.email,
      user_id: authenticatedUserId,
      total: total,
      status,
      stripe_session_id: null,
      shipping_address: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
        notes: formData.notes?.trim() || '',
        paymentMethod,
        installation: includeInstallation ? {
          requested: true,
          fee: installationFee,
          deviceCount,
        } : { requested: false },
        paymentToken,
        ...extraShippingData,
      },
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) throw orderError;

    // Resolve which product IDs actually exist — guards against stale carts after
    // backend migrations where a product UUID may no longer be in the catalog.
    const candidateIds = items
      .map((i) => i.product.id)
      .filter((id) => typeof id === 'string' && !id.startsWith('bundle-'));
    let validIds = new Set<string>();
    if (candidateIds.length > 0) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .in('id', candidateIds);
      validIds = new Set((existing ?? []).map((p: any) => p.id));
    }

    // Bundle items + unknown products are stored with product_id = null so the FK holds.
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id:
        item.product.id.startsWith('bundle-') || !validIds.has(item.product.id)
          ? null
          : item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Redeem loyalty points if any
    if (pointsToRedeem > 0) {
      try {
        await supabase.rpc('redeem_loyalty_points', {
          p_email: formData.email,
          p_points: pointsToRedeem,
          p_order_id: orderId,
        });
      } catch (redeemError) {
        console.warn('Could not redeem loyalty points:', redeemError);
      }
    }

    // Award loyalty points
    try {
      await supabase.rpc('award_loyalty_points', {
        p_email: formData.email,
        p_order_id: orderId,
        p_order_total: total,
        p_user_id: authenticatedUserId,
      });
    } catch (loyaltyError) {
      console.warn('Could not award loyalty points:', loyaltyError);
    }

    // Coupon usage tracking is handled via admin reports — public increment was removed
    // to prevent abuse (anyone could exhaust max_uses by replaying the request).

    // Send order notification email — never block the order on email failures.
    supabase.functions.invoke('send-order-notification', {
      body: { orderId, paymentMethod },
    }).then(({ error }) => {
      if (error) console.warn('Could not send order notification:', error);
    }).catch((e) => console.warn('Could not send order notification:', e));

    return orderData;
  };

  const handlePaySkyPayment = async () => {
    try {
      const order = await createOrder('pending');
      setPaySkyOrderId(order.id);

      // Read PaySky credentials directly from site_info (configured in admin settings)
      const { data: rows } = await supabase
        .from('site_info')
        .select('key, value')
        .eq('section', 'payment')
        .in('key', ['paysky_mid', 'paysky_tid', 'paysky_secret_key']);

      const db: Record<string, string> = {};
      (rows || []).forEach((r: any) => { db[r.key] = r.value; });

      const MID       = db['paysky_mid'] || '8386003528';
      const TID       = db['paysky_tid'] || '93655786';
      const secretKey = db['paysky_secret_key'] || '80814719f6d488f83e9c1f655423349a';

      if (!MID || !TID || !secretKey) {
        throw new Error(language === 'ar' ? 'بوابة الدفع غير مهيأة' : 'Payment gateway not configured');
      }

      // Build transaction params
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const dateTimeLocalTrxn = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
      const merchantRef = `BZ_${order.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;
      // PaySky LightBox: Amount in hash is piasters (100 piasters = 1 EGP), amount in URL is EGP
      const amountPiasters = Math.round(total * 100);
      const amountEGP = (amountPiasters / 100).toString();

      // Compute SecureHash (HMAC-SHA256)
      // Hash uses PaySky's internal key names sorted alphabetically:
      //   Amount (piasters) / DateTimeLocalTrxn / MerchantId / MerchantReference / TerminalId
      const hashParams: Record<string, string> = {
        Amount: amountPiasters.toString(),
        DateTimeLocalTrxn: dateTimeLocalTrxn,
        MerchantId: MID,
        MerchantReference: merchantRef,
        TerminalId: TID,
      };
      const queryString = Object.keys(hashParams).sort().map(k => `${k}=${hashParams[k]}`).join('&');
      const cleaned = secretKey.trim().replace(/\s+/g, '');
      const keyBytes = /^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0
        ? new Uint8Array(cleaned.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)))
        : new TextEncoder().encode(cleaned);
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(queryString));
      const secureHash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // Build the PaySky hosted checkout URL:
      const returnUrl = `${window.location.origin}/checkout`;
      const params = new URLSearchParams({
        MID,
        TID,
        amount: amountEGP,
        trxDateTime: dateTimeLocalTrxn,
        MerchantReference: merchantRef,
        secureHashAnonymous: secureHash,
        OrderID: order.id,
        returnUrl: returnUrl,
        CustomerEmail: formData.email?.trim() || '',
        CustomerMobile: formData.phone?.trim() || '',
      });
      const url = `https://cube.paysky.io:6006/Home/LightboxHostedCheckout/?${params.toString()}`;

      // Open in a centered popup window
      const w = 520, h = 720;
      const left = (window.screen.availWidth - w) / 2;
      const top = (window.screen.availHeight - h) / 2;
      const popup = window.open(
        url,
        'paysky-checkout',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no`
      );
      paySkyWindowRef.current = popup;
      if (!popup || popup.closed) {
        toast({
          variant: 'destructive',
          title: language === 'ar' ? 'تم حظر النافذة' : 'Popup Blocked',
          description: language === 'ar'
            ? 'فضلاً اسمح بالنوافذ المنبثقة لإكمال الدفع، أو اضغط على رابط الدفع في النافذة.'
            : 'Please allow popups to complete payment, or use the open-payment link in the dialog.',
        });
      }
      setPaySkyCheckoutUrl(url);
    } catch (error: any) {
      console.error('PaySky error:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ في الدفع' : 'Payment Error',
        description: error.message || 'Failed to initialize payment',
      });
      setIsProcessing(false);
    }
  };

  const handleInstaPayPayment = async () => {
    let receiptUrl = '';
    if (instapayReceiptFile) {
      try {
        const fileExt = instapayReceiptFile.name.split('.').pop() || 'jpg';
        const filePath = `receipts/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('site-assets')
          .upload(filePath, instapayReceiptFile, { upsert: true });
        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(filePath);
          receiptUrl = publicUrl;
        }
      } catch (uploadError) {
        console.warn('Receipt upload failed, proceeding with reference only:', uploadError);
      }
    }

    const order = await createOrder('pending', {
      paymentMethod: 'instapay',
      instapayReference: instapayReference.trim(),
      instapayReceiptUrl: receiptUrl,
    });

    toast({
      title: language === 'ar' ? 'تم تسجيل الطلب بنجاح' : 'Order Placed Successfully',
      description: language === 'ar'
        ? 'تم تسجيل طلبك عبر إنستاباي. سيتم التحقق من التحويل وتأكيد الشحن.'
        : 'Your InstaPay order has been recorded. We will verify your transfer and confirm shipment.',
    });

    clearCart();
    navigate(`/order-confirmation?orderId=${order.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof CheckoutFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'card') {
        // Process card payment via PaySky
        await handlePaySkyPayment();
      } else if (paymentMethod === 'instapay') {
        // Process InstaPay transfer
        await handleInstaPayPayment();
      } else {
        // Cash on Delivery - create order directly
        const order = await createOrder('pending', { paymentMethod: 'cod' });

        toast({
          title: language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order Created Successfully',
          description: language === 'ar' 
            ? 'سيتم التواصل معك لتأكيد الطلب والتوصيل'
            : 'We will contact you to confirm the order and arrange delivery',
        });

        clearCart();
        navigate(`/order-confirmation?orderId=${order.id}`);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.'
          : 'An error occurred while creating your order. Please try again.',
      });
      setIsProcessing(false);
    }
  };

  const labels = {
    checkout: language === 'ar' ? 'إتمام الطلب' : 'Checkout',
    shippingInfo: language === 'ar' ? 'معلومات الشحن' : 'Shipping Information',
    firstName: language === 'ar' ? 'الاسم الأول' : 'First Name',
    lastName: language === 'ar' ? 'اسم العائلة' : 'Last Name',
    email: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phone: language === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    address: language === 'ar' ? 'العنوان' : 'Address',
    city: language === 'ar' ? 'المدينة' : 'City',
    governorate: language === 'ar' ? 'المحافظة' : 'Governorate',
    orderSummary: language === 'ar' ? 'ملخص الطلب' : 'Order Summary',
    subtotal: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
    shipping: language === 'ar' ? 'الشحن' : 'Shipping',
    freeShipping: language === 'ar' ? 'مجاني' : 'Free',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    placeOrder: language === 'ar' ? 'إتمام الطلب' : 'Place Order',
    processing: language === 'ar' ? 'جاري المعالجة...' : 'Processing...',
    backToCart: language === 'ar' ? 'العودة للسلة' : 'Back to Cart',
    paymentMethod: language === 'ar' ? 'طريقة الدفع' : 'Payment Method',
    cardPayment: language === 'ar' ? 'بطاقة ائتمان' : 'Credit / Debit Card',
    pointsDiscount: language === 'ar' ? 'خصم النقاط' : 'Points Discount',
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{`${labels.checkout} | AzkaSmart`}</title>
      </Helmet>

      {/* PaySky Payment Modal */}
      {paySkyCheckoutUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={cn(
            "relative bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-2xl p-6 text-center",
            isRTL ? "border-l-4 border-primary" : "border-r-4 border-primary",
          )} style={{ width: '100%', maxWidth: '440px' }}>
            <button
              type="button"
              onClick={() => { try { paySkyWindowRef.current?.close(); } catch {} setPaySkyCheckoutUrl(null); setIsProcessing(false); }}
              className={cn(
                "absolute top-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground",
                isRTL ? "right-3" : "left-3",
              )}
              aria-label="Close payment"
            >
              <XIcon className="w-4 h-4" />
            </button>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {language === 'ar' ? 'إكمال الدفع الإلكتروني' : 'Complete Card Payment'}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {language === 'ar'
                ? 'تم فتح صفحة PaySky الآمنة. أكمل عملية إدخال بيانات البطاقة وستتم معالجة الطلب تلقائياً.'
                : 'A secure PaySky payment window has opened. Complete your card payment there and you will be returned automatically.'}
            </p>
            <div className="space-y-2.5">
              <a
                href={paySkyCheckoutUrl}
                target="_blank"
                rel="opener"
                className="inline-block w-full rounded-lg bg-primary text-primary-foreground font-medium py-3 px-4 hover:opacity-90 transition shadow-sm"
              >
                {language === 'ar' ? 'فتح نافذة الدفع مرة أخرى' : 'Open Payment Window'}
              </a>
              <button
                type="button"
                onClick={async () => {
                  try { paySkyWindowRef.current?.close(); } catch {}
                  setPaySkyCheckoutUrl(null);
                  if (paySkyOrderId) {
                    try {
                      await supabase.from('orders').update({ status: 'processing' }).eq('id', paySkyOrderId);
                    } catch {}
                    clearCart();
                    navigate(`/order-confirmation?orderId=${paySkyOrderId}`);
                  }
                  setIsProcessing(false);
                }}
                className="w-full rounded-lg border border-emerald-500/40 bg-emerald-50 text-emerald-700 font-medium py-2.5 px-4 hover:bg-emerald-100 transition text-sm dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {language === 'ar' ? '✓ تم إتمام الدفع بالبطاقة' : '✓ I have completed payment'}
              </button>
              <button
                type="button"
                onClick={() => { try { paySkyWindowRef.current?.close(); } catch {} setPaySkyCheckoutUrl(null); setIsProcessing(false); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-1"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Layout>
        <div className="container py-8 md:py-12">
          {/* Back Button */}
          <button
            onClick={() => navigate('/cart')}
            className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BackArrow className="h-4 w-4" />
            {labels.backToCart}
          </button>

          <h1 className="mb-8 font-display text-3xl font-bold text-foreground md:text-4xl">
            {labels.checkout}
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              {/* Shipping Form */}
              <div className="space-y-6">
                {/* AI Compatibility Check */}
                <CompatibilityCheck />

                {/* Sign-in banner */}
                {!user && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <LogIn className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {language === 'ar' ? 'سجّل لجمع النقاط' : 'Sign in to earn rewards'}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {language === 'ar'
                        ? 'أنشئ حساب بسرعة لجمع نقاط الولاء واستبدالها بخصومات على طلباتك القادمة'
                        : 'Create an account to earn loyalty points and redeem them for future discounts'}
                    </p>
                    <AuthButton variant="default" size="default" showProfile={false} />
                  </div>
                )}

                {user && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-foreground">
                          {language === 'ar' ? 'تم تسجيل الدخول' : 'Signed in as'} {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'سيتم جمع نقاط الولاء تلقائياً' : 'Loyalty points will be earned automatically'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-6 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {labels.shippingInfo}
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{labels.firstName}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? 'border-destructive' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">{labels.lastName}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? 'border-destructive' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{labels.email}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{labels.phone}</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">{labels.address}</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={errors.address ? 'border-destructive' : ''}
                      />
                      {errors.address && (
                        <p className="text-sm text-destructive">{errors.address}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">{labels.city}</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={errors.city ? 'border-destructive' : ''}
                      />
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="governorate">{labels.governorate}</Label>
                      <Select
                        value={formData.governorate}
                        onValueChange={(val) => {
                          setFormData(prev => ({ ...prev, governorate: val }));
                          if (errors.governorate) setErrors(prev => ({ ...prev, governorate: undefined }));
                        }}
                      >
                        <SelectTrigger id="governorate" className={errors.governorate ? 'border-destructive' : ''}>
                          <SelectValue placeholder={language === 'ar' ? 'اختر المحافظة' : 'Select Governorate'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {EGYPT_GOVERNORATES.map((gov) => (
                            <SelectItem key={gov.en} value={gov.en}>
                              {language === 'ar' ? gov.ar : gov.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.governorate && (
                        <p className="text-sm text-destructive">{errors.governorate}</p>
                      )}
                    </div>

                    {/* Order Notes / Delivery Instructions */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="notes">
                        {language === 'ar' ? 'ملاحظات التوصيل / العنوان (اختياري)' : 'Delivery Notes / Special Instructions (Optional)'}
                      </Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        placeholder={language === 'ar' ? 'مثال: رقم الشقة، الدور، أو الاتصال قبل الوصول...' : 'e.g. Apartment/Floor number, landmark, call before arrival...'}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-6 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {labels.paymentMethod}
                  </h2>
                  
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
                    className="space-y-3"
                  >
                    {/* Card Payment */}
                    {payskyEnabled && (
                      <div 
                        className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          paymentMethod === 'card' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setPaymentMethod('card')}
                      >
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{labels.cardPayment}</p>
                                <p className="text-sm text-muted-foreground">
                                  {language === 'ar' ? 'دفع آمن عبر PaySky (فيزا / ماستركارد / ميزة)' : 'Secure payment via PaySky (Visa / Mastercard / Meeza)'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex h-6 items-center rounded-md bg-[#1A1F71] px-2 text-[11px] font-bold italic tracking-wider text-white">
                                VISA
                              </span>
                              <span className="inline-flex h-6 w-9 items-center justify-center rounded-md bg-white px-1 shadow-sm ring-1 ring-black/5">
                                <span className="block h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                                <span className="-ml-1.5 block h-3.5 w-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
                              </span>
                            </div>
                          </div>
                        </Label>
                      </div>
                    )}

                    {/* InstaPay */}
                    {instapayEnabled && (
                      <div 
                        className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          paymentMethod === 'instapay' 
                            ? 'border-purple-600 bg-purple-500/5' 
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setPaymentMethod('instapay')}
                      >
                        <div className="flex items-center space-x-4">
                          <RadioGroupItem value="instapay" id="instapay" />
                          <Label htmlFor="instapay" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] text-white shadow-sm">
                                  <Smartphone className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {language === 'ar' ? 'الدفع عبر إنستاباي (InstaPay)' : 'Pay via InstaPay'}
                                    </p>
                                    <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                      تحويل لحظي
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {language === 'ar' ? 'تحويل فوري مباشر عبر تطبيق إنستاباي بدون رسوم إضافية' : 'Instant direct transfer via InstaPay app with zero fees'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>

                        {/* Expandable InstaPay Instructions Card */}
                        {paymentMethod === 'instapay' && (
                          <div className="mt-4 pt-4 border-t border-purple-500/20 space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 font-semibold">
                                <span>{language === 'ar' ? 'بيانات التحويل عبر إنستاباي:' : 'InstaPay Transfer Details:'}</span>
                                <span className="bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded font-mono font-bold text-sm">
                                  {formatPrice(total)}
                                </span>
                              </div>

                              {/* InstaPay Address */}
                              <div className="flex items-center justify-between bg-white dark:bg-card p-2.5 rounded-lg border border-purple-100 dark:border-purple-900">
                                <div>
                                  <span className="text-[11px] text-muted-foreground block">{language === 'ar' ? 'عنوان إنستاباي (IPA):' : 'InstaPay Address (IPA):'}</span>
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    {getInfo('payment', 'instapay_address', 'azkasmart@instapay')}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => copyToClipboard(getInfo('payment', 'instapay_address', 'azkasmart@instapay'), 'ipa')}
                                >
                                  {copiedField === 'ipa' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copiedField === 'ipa' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
                                </Button>
                              </div>

                              {/* InstaPay Phone */}
                              <div className="flex items-center justify-between bg-white dark:bg-card p-2.5 rounded-lg border border-purple-100 dark:border-purple-900">
                                <div>
                                  <span className="text-[11px] text-muted-foreground block">{language === 'ar' ? 'رقم الهاتف المسجل في إنستاباي:' : 'InstaPay Mobile Number:'}</span>
                                  <span className="font-mono font-bold text-sm text-foreground" dir="ltr">
                                    {getInfo('payment', 'instapay_phone', '01050627310')}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => copyToClipboard(getInfo('payment', 'instapay_phone', '01050627310'), 'phone')}
                                >
                                  {copiedField === 'phone' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copiedField === 'phone' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
                                </Button>
                              </div>

                              {/* Account Name */}
                              <div className="text-xs text-muted-foreground">
                                <span>{language === 'ar' ? 'اسم الحساب:' : 'Account Name:'} </span>
                                <strong className="text-foreground">{getInfo('payment', 'instapay_name', 'AzkaSmart')}</strong>
                              </div>
                            </div>

                            {/* Verification Reference Input */}
                            <div className="space-y-1.5">
                              <Label htmlFor="instapayRef" className="text-xs font-medium">
                                {language === 'ar' ? 'رقم العملية أو اسم / رقم المحول (للتحقق):' : 'Transfer Reference / Sender Name or Phone (for verification):'}
                              </Label>
                              <Input
                                id="instapayRef"
                                value={instapayReference}
                                onChange={(e) => setInstapayReference(e.target.value)}
                                placeholder={language === 'ar' ? 'مثال: رقم التحويل، أو اسم صاحب الحساب المحول منه...' : 'e.g. Transfer ID, or sender account name/phone...'}
                                className="text-sm"
                              />
                            </div>

                            {/* Receipt Upload */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium block">
                                {language === 'ar' ? 'إرفاق إيصال التحويل (اختياري):' : 'Attach Transfer Receipt (Optional):'}
                              </Label>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-lg cursor-pointer hover:bg-muted text-xs font-medium transition">
                                  <UploadCloud className="h-4 w-4 text-purple-600" />
                                  <span>{instapayReceiptFile ? instapayReceiptFile.name : (language === 'ar' ? 'اختيار صورة الإيصال' : 'Choose Receipt Image')}</span>
                                  <input type="file" accept="image/*,.pdf" onChange={handleReceiptChange} className="hidden" />
                                </label>
                                {instapayReceiptPreview && (
                                  <div className="relative">
                                    <img src={instapayReceiptPreview} alt="Receipt Preview" className="h-10 w-10 object-cover rounded border" />
                                    <button
                                      type="button"
                                      onClick={() => { setInstapayReceiptFile(null); setInstapayReceiptPreview(null); }}
                                      className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-white rounded-full flex items-center justify-center text-[10px]"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Instant WhatsApp Verification Support */}
                            <div className="pt-2 border-t border-purple-500/10">
                              <a
                                href={`https://wa.me/${getInfo('contact', 'whatsapp', '201050627310').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `مرحباً أزكاسمارت، أود تأكيد الدفع عبر إنستاباي بمبلغ ${total} ج.م.\nالاسم: ${formData.firstName} ${formData.lastName}\nالهاتف: ${formData.phone}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                {language === 'ar' ? 'أو يمكنك إرسال صورة التحويل عبر واتساب مباشرة' : 'Or send the transfer receipt via WhatsApp directly'}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cash on Delivery */}
                    {codEnabled && (
                      <div 
                        className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          paymentMethod === 'cod' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setPaymentMethod('cod')}
                      >
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Banknote className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">
                                  {language === 'ar' ? 'الدفع عند الاستلام (نقداً)' : 'Cash on Delivery (COD)'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {language === 'ar' ? 'ادفع نقداً عند استلام الشحنة وتأكيد الطلب' : 'Pay in cash upon delivery of your order'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Professional Installation */}
                <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {language === 'ar' ? 'التركيب الاحترافي' : 'Professional Installation'}
                      </h2>
                    </div>
                    <Switch checked={includeInstallation} onCheckedChange={setIncludeInstallation} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'ar'
                      ? `فريقنا المعتمد يركّب أجهزتك ويهيئها لك. الرسوم: ١٥٠ جنيه لكل جهاز (بحد أقصى ١٥٠٠ جنيه).`
                      : `Our certified team installs and configures your devices. Fee: 150 EGP per device (capped at 1500 EGP).`}
                  </p>
                  {includeInstallation && (
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {language === 'ar'
                          ? `${deviceCount} جهاز × ١٥٠ ج.م`
                          : `${deviceCount} device${deviceCount === 1 ? '' : 's'} × 150 EGP`}
                      </span>
                      <span className="font-display text-lg font-bold text-primary">
                        {formatPrice(installationFee)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Coupon Code */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'كود الخصم' : 'Coupon Code'}
                  </h2>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="font-mono font-bold text-green-600">{appliedCoupon.code}</span>
                        <span className="text-sm text-green-600">
                          (-{formatPrice(couponDiscount)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={language === 'ar' ? 'أدخل كود الخصم' : 'Enter coupon code'}
                        className="font-mono uppercase"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {language === 'ar' ? 'تطبيق' : 'Apply'}
                        <ArrowRight className={cn("ml-1 h-3 w-3 transition-transform hover:scale-110", language === 'ar' && "rotate-180 mr-1 ml-0")} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'استبدال النقاط' : 'Redeem Points'}
                  </h2>
                  <PointsRedemption
                    email={formData.email}
                    maxDiscount={totalBeforeDiscount}
                    onRedemptionChange={handleRedemptionChange}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="h-fit rounded-xl border border-border bg-card p-6">
                <h2 className="mb-6 font-display text-xl font-semibold text-foreground">
                  {labels.orderSummary}
                </h2>

                {/* Items */}
                <div className="mb-6 space-y-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.product.image_url || '/placeholder.svg'}
                          alt={item.product.name}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{labels.subtotal}</span>
                    <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{labels.shipping}</span>
                    <span className="font-medium text-foreground">
                      {shippingCost === 0 ? labels.freeShipping : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {includeInstallation && installationFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'التركيب' : 'Installation'}
                      </span>
                      <span className="font-medium text-foreground">{formatPrice(installationFee)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {appliedCoupon?.code}
                      </span>
                      <span className="font-medium text-green-600">-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">{labels.pointsDiscount}</span>
                      <span className="font-medium text-green-600">-{formatPrice(pointsDiscount)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-display text-lg font-semibold text-foreground">
                        {labels.total}
                      </span>
                      <div className="text-right">
                        {pointsDiscount > 0 && (
                          <span className="block text-sm text-muted-foreground line-through">
                            {formatPrice(totalBeforeDiscount)}
                          </span>
                        )}
                        <span className="font-display text-xl font-bold text-foreground">
                          {formatPrice(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="mt-6 w-full gap-2 glow-primary" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {labels.processing}
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'card' ? (
                        <>
                          <CreditCard className="h-4 w-4" />
                          {language === 'ar' ? 'الدفع بالبطاقة' : 'Pay with Card'}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          {labels.placeOrder}
                        </>
                      )}
                    </>
                  )}
                </Button>

                {/* Security Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>
                    {language === 'ar' ? 'معاملات آمنة ومشفرة' : 'Secure & encrypted transactions'}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
};

export default Checkout;
