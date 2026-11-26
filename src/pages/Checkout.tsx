import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CreditCard, Banknote, Truck, Shield, Loader2, Gift, CheckCircle, AlertCircle, LogIn, Wrench, Tag, X as XIcon, Copy, Check, Smartphone, UploadCloud, MessageCircle } from 'lucide-react';
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
import { getTextDirection, isolateBidiUnits } from '@/lib/bidi';
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

const ARABIC_FIELD_ERRORS: Record<string, string> = {
  firstName: 'الاسم الأول مطلوب (حرفان على الأقل)',
  lastName: 'اسم العائلة مطلوب (حرفان على الأقل)',
  email: 'يرجى إدخال بريد إلكتروني صحيح',
  phone: 'رقم الهاتف مطلوب (١٠ أرقام على الأقل)',
  address: 'العنوان مطلوب (٥ أحرف على الأقل)',
  city: 'المدينة مطلوبة (حرفان على الأقل)',
  governorate: 'المحافظة مطلوبة',
};

const safeUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};


const XPAY_SDK_URL = 'https://checkout.xpay.app/v1/sdk.js';

const loadXPaySdk = (): Promise<(publishableKey: string) => any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && typeof (window as any).XPay === 'function') {
      resolve((window as any).XPay);
      return;
    }

    const existing = document.getElementById('xpay-checkout-sdk') as HTMLScriptElement | null;
    if (existing) {
      if (typeof (window as any).XPay === 'function') {
        resolve((window as any).XPay);
        return;
      }
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = 'xpay-checkout-sdk';
    script.src = XPAY_SDK_URL;
    script.async = true;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    script.onload = () => {
      cleanup();
      if (typeof (window as any).XPay === 'function') {
        resolve((window as any).XPay);
      } else {
        setTimeout(() => {
          if (typeof (window as any).XPay === 'function') {
            resolve((window as any).XPay);
          } else {
            script.remove();
            reject(new Error('XPay SDK loaded but window.XPay is unavailable'));
          }
        }, 150);
      }
    };

    script.onerror = () => {
      cleanup();
      script.remove();
      reject(new Error('Failed to load XPay checkout SDK'));
    };

    timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error('Timeout loading XPay checkout SDK'));
    }, 15000);

    document.head.appendChild(script);
  });
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, activeBundleId, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { get: getInfo, refresh: refreshInfo } = useSiteInfo();

  useEffect(() => {
    refreshInfo();
  }, [refreshInfo]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: 'percentage' | 'fixed'; discountValue: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'xpay' | 'instapay' | 'cod'>('instapay');
  const [paymentStatusMessage, setPaymentStatusMessage] = useState<{ type: 'error' | 'cancelled'; text: string } | null>(null);
  const [instapayReference, setInstapayReference] = useState('');
  const [instapayReceiptFile, setInstapayReceiptFile] = useState<File | null>(null);
  const [instapayReceiptPreview, setInstapayReceiptPreview] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [includeInstallation, setIncludeInstallation] = useState(true);

  const xpayMode: 'test' | 'live' = getInfo('payment', 'xpay_mode', 'test') === 'live' ? 'live' : 'test';
  const xpayPublishableKey = (
    getInfo('payment', 'xpay_publishable_key', '') ||
    getInfo('payment', xpayMode === 'live' ? 'xpay_publishable_key_live' : 'xpay_publishable_key_test', '')
  ).trim();
  const xpayKeyValid =
    xpayMode === 'live'
      ? xpayPublishableKey.startsWith('pk_live_')
      : xpayPublishableKey.startsWith('pk_test_');
  const xpaySecretConfigured = getInfo('payment', 'xpay_secret_configured', 'false') === 'true';
  const xpayEnabled =
    getInfo('payment', 'xpay_enabled', 'false') === 'true' &&
    xpayKeyValid &&
    xpaySecretConfigured;
  const instapayEnabled = getInfo('payment', 'instapay_enabled', 'true') !== 'false';
  const codEnabled = getInfo('payment', 'cod_enabled', 'true') !== 'false';

  // Auto-select an available payment method when toggles change
  useEffect(() => {
    setPaymentMethod((current) => {
      if (current === 'xpay' && !xpayEnabled) {
        return instapayEnabled ? 'instapay' : codEnabled ? 'cod' : current;
      }
      if (current === 'instapay' && !instapayEnabled) {
        return xpayEnabled ? 'xpay' : codEnabled ? 'cod' : current;
      }
      if (current === 'cod' && !codEnabled) {
        return instapayEnabled ? 'instapay' : xpayEnabled ? 'xpay' : current;
      }
      return current;
    });
  }, [xpayEnabled, instapayEnabled, codEnabled]);

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



  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const subtotal = getTotal();
  const isBundleOrder = Boolean(activeBundleId);
  const shippingFlat = Number(getInfo('service_prices', 'shipping_flat', '50')) || 0;
  const shippingThreshold = Number(getInfo('service_prices', 'shipping_free_threshold', '1000')) || 0;
  const shippingCost = shippingThreshold > 0 && subtotal >= shippingThreshold ? 0 : shippingFlat;
  // Regular installation fee: 20% of subtotal, minimum 1500 EGP per visit.
  // For official bundles, certified installation is 100% FREE (0 EGP).
  const regularInstallationFee = subtotal > 0 ? Math.max(1500, Math.round(subtotal * 0.20)) : 0;
  const installationFee = includeInstallation && subtotal > 0
    ? (isBundleOrder ? 0 : regularInstallationFee)
    : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round(subtotal * appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, subtotal)
    : 0;
  const totalBeforeDiscount = subtotal + shippingCost + installationFee;
  const baseTotal = Math.max(0, totalBeforeDiscount - pointsDiscount - couponDiscount);
  const xpayCardFeePercent = Math.max(0, Number(getInfo('payment', 'xpay_card_fee_percent', '0')) || 0);
  const xpayCardFeeFixed = Math.max(0, Number(getInfo('payment', 'xpay_card_fee_fixed', '0')) || 0);
  const cardFee =
    paymentMethod === 'xpay' && (xpayCardFeePercent > 0 || xpayCardFeeFixed > 0)
      ? Math.round((baseTotal * (xpayCardFeePercent / 100) + xpayCardFeeFixed) * 100) / 100
      : 0;
  const total = Math.max(0, baseTotal + cardFee);

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
    const orderId = safeUUID();
    const paymentToken = safeUUID();
    const deviceCount = items.reduce((count, item) => count + (item.quantity || 1), 0);

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
          freeWithBundle: isBundleOrder,
          bundleId: activeBundleId || undefined,
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
      .map((i) => i.product?.id)
      .filter((id): id is string => typeof id === 'string' && !id.startsWith('bundle-'));
    let validIds = new Set<string>();
    if (candidateIds.length > 0) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .in('id', candidateIds);
      validIds = new Set((existing ?? []).map((p: any) => p.id));
    }

    // Bundle items + unknown products are stored with product_id = null so the FK holds.
    const orderItems = items.map((item) => {
      const pid = item.product?.id;
      const isValid = typeof pid === 'string' && !pid.startsWith('bundle-') && validIds.has(pid);
      return {
        order_id: orderId,
        product_id: isValid ? pid : null,
        product_name: item.product?.name || 'Product',
        quantity: item.quantity || 1,
        price: Number(item.product?.price) || 0,
      };
    });

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

    // Send order notification email and wait (up to 6s) so navigation never aborts the request.
    // For XPay card orders, confirmation email is triggered strictly by the verified xpay-webhook
    // once payment succeeds.
    let notificationDelivered = false;
    if (paymentMethod !== 'xpay') {
      try {
        const invokePromise = supabase.functions.invoke('send-order-notification', {
          body: { orderId, paymentMethod, isPaid: false },
        });
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Notification timeout') }), 6000)
        );
        const { data: notifyRes, error: notifyErr } = await Promise.race([invokePromise, timeoutPromise]);
        if (notifyErr) {
          console.warn('Could not send order notification:', notifyErr);
        } else if (notifyRes?.emailSent) {
          notificationDelivered = true;
        }
      } catch (e) {
        console.warn('Could not send order notification:', e);
      }
    }

    // Store last order receipt in sessionStorage so OrderConfirmation page can display
    // full receipt and PDF even for guest checkouts (bypassing RLS read restriction).
    try {
      const receiptData = {
        id: orderId,
        email: formData.email,
        total,
        status: status || 'pending',
        created_at: new Date().toISOString(),
        shipping_address: {
          ...orderData.shipping_address,
          notificationDelivered,
        },
        items: items.map((i, idx) => ({
          id: i.product?.id || `item-${idx}`,
          product_name: i.product?.name || 'Product',
          quantity: i.quantity || 1,
          price: Number(i.product?.price) || 0,
        })),
      };
      sessionStorage.setItem('last_order_receipt', JSON.stringify(receiptData));
    } catch (e) {
      console.warn('Could not cache order receipt:', e);
    }

    return orderData;
  };

  const handleXPayPayment = async () => {
    setPaymentStatusMessage(null);
    if (!xpayEnabled || !xpayPublishableKey) {
      throw new Error(
        language === 'ar'
          ? 'الدفع بالبطاقة غير متاح حالياً. يمكنك استخدام إنستاباي.'
          : 'Card payments are currently unavailable. Please use InstaPay.'
      );
    }

    try {
      const xpayFactory = await loadXPaySdk();
      const order = await createOrder('pending_payment', {
        paymentMethod: 'xpay',
        shippingCost,
        cardFee,
        couponDiscount,
        pointsDiscount,
      });

      const { data: sessionRes, error: sessionErr } = await supabase.functions.invoke('xpay-checkout', {
        body: {
          action: 'create-session',
          orderId: order.id,
          paymentToken: order.shipping_address.paymentToken,
          language,
          origin: window.location.origin,
        },
      });

      if (sessionErr || !sessionRes?.success || !sessionRes?.clientSecret) {
        throw new Error(
          sessionRes?.error ||
            sessionErr?.message ||
            (language === 'ar' ? 'تعذر تهيئة جلسة الدفع الإلكتروني' : 'Failed to initialize card payment session')
        );
      }

      // Sync cached receipt with pending_payment + sessionId so return page can verify DB status
      try {
        const cached = sessionStorage.getItem('last_order_receipt');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id === order.id) {
            parsed.status = 'pending_payment';
            if (parsed.shipping_address) {
              parsed.shipping_address.xpay = {
                sessionId: sessionRes.sessionId,
                mode: sessionRes.mode,
                paymentStatus: 'unpaid',
              };
            }
            sessionStorage.setItem('last_order_receipt', JSON.stringify(parsed));
          }
        }
      } catch (cacheErr) {
        console.warn('Could not sync cached receipt with XPay session:', cacheErr);
      }

      let paymentCompleted = false;
      const xpayClient = xpayFactory(xpayPublishableKey);
      const checkoutInstance = xpayClient.checkout({
        clientSecret: sessionRes.clientSecret,
        mode: 'modal',
        locale: language === 'ar' ? 'ar' : 'en',
        appearance: {
          borderStyle: 'rounded',
          colors: { primary: '#0EA5A4' },
        },
        onComplete: (result: any) => {
          paymentCompleted = true;
          if (result?.paymentStatus === 'paid' || result?.status === 'succeeded') {
            clearCart();
          }
          navigate(
            `/order-confirmation?orderId=${encodeURIComponent(order.id)}&session_id=${encodeURIComponent(
              sessionRes.sessionId
            )}`
          );
        },
        onError: (err: any) => {
          const msg =
            (typeof err?.message === 'string' && err.message) ||
            (language === 'ar'
              ? 'تعذر إتمام عملية الدفع بالبطاقة. طلبك ما زال غير مدفوع وسلتك محفوظة.'
              : 'Card payment could not be completed. Your order remains unpaid and your cart is intact.');
          setPaymentStatusMessage({ type: 'error', text: msg });
          toast({
            variant: 'destructive',
            title: language === 'ar' ? 'فشل الدفع' : 'Payment Failed',
            description: msg,
          });
          setIsProcessing(false);
        },
        onClose: () => {
          if (!paymentCompleted) {
            const msg =
              language === 'ar'
                ? 'تم إلغاء نافذة الدفع. طلبك لم يُدفع وسلة التسوق محفوظة كما هي.'
                : 'Checkout window closed before completing payment. Your order remains unpaid and your cart is intact.';
            setPaymentStatusMessage({ type: 'cancelled', text: msg });
            toast({
              title: language === 'ar' ? 'تم إلغاء الدفع' : 'Payment Cancelled',
              description: msg,
            });
            setIsProcessing(false);
          }
        },
      });

      checkoutInstance.open();
    } catch (error: any) {
      const msg =
        error?.message ||
        (language === 'ar' ? 'تعذر بدء الدفع بالبطاقة. حاول مرة أخرى.' : 'Failed to start card payment. Please try again.');
      setPaymentStatusMessage({ type: 'error', text: msg });
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ في الدفع' : 'Payment Error',
        description: msg,
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
        const field = err.path[0] as keyof CheckoutFormData;
        if (field) {
          fieldErrors[field] = language === 'ar'
            ? (ARABIC_FIELD_ERRORS[field] || err.message)
            : err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'xpay') {
        await handleXPayPayment();
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
    cardPayment: language === 'ar' ? 'الدفع بالبطاقة (XPay)' : 'Pay by card (XPay)',
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



      <Layout>
        <div className="container px-4 sm:px-6 lg:px-8 pt-24 pb-12 md:pt-28 md:pb-16">
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
            <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
              {/* Shipping Form */}
              <div className="space-y-6 min-w-0">
                {/* AI Compatibility Check */}
                <CompatibilityCheck />

                {/* Sign-in banner */}
                {!user && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <LogIn className="h-5 w-5 text-primary shrink-0" />
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {language === 'ar' ? 'سجّل لجمع النقاط' : 'Sign in to earn rewards'}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 break-words">
                      {language === 'ar'
                        ? 'أنشئ حساب بسرعة لجمع نقاط الولاء واستبدالها بخصومات على طلباتك القادمة'
                        : 'Create an account to earn loyalty points and redeem them for future discounts'}
                    </p>
                    <AuthButton variant="default" size="default" showProfile={false} />
                  </div>
                )}

                {user && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 min-w-0">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground break-words">
                          {language === 'ar' ? 'تم تسجيل الدخول' : 'Signed in as'} {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'سيتم جمع نقاط الولاء تلقائياً' : 'Loyalty points will be earned automatically'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl azka-glass p-4 sm:p-6 min-w-0">
                  <h2 className="mb-6 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {labels.shippingInfo}
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div className="rounded-2xl azka-glass p-4 sm:p-6 min-w-0">
                  <h2 className="mb-6 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary shrink-0" />
                    {labels.paymentMethod}
                  </h2>
                  
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => {
                      setPaymentMethod(value as 'xpay' | 'instapay' | 'cod');
                      setPaymentStatusMessage(null);
                    }}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="space-y-3"
                  >
                    {/* Card Payment (XPay Drop-in) */}
                    {xpayEnabled && (
                      <div
                        className={`relative rounded-xl border-2 transition-all min-w-0 ${
                          paymentMethod === 'xpay'
                            ? 'border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/30'
                            : 'border-border/80 hover:border-primary/40 bg-card hover:bg-muted/20'
                        }`}
                      >
                        <div className="relative flex items-start gap-3 sm:gap-3.5 p-3 sm:p-4 min-w-0">
                          <RadioGroupItem
                            value="xpay"
                            id="xpay"
                            className="relative z-10 h-5 w-5 shrink-0 mt-1 border-2"
                          />
                          <Label
                            htmlFor="xpay"
                            className="flex-1 min-w-0 cursor-pointer select-none after:content-[''] after:absolute after:inset-0"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <CreditCard className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <p className="font-semibold text-foreground text-sm sm:text-base">{labels.cardPayment}</p>
                                  {xpayMode === 'test' && (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                      {language === 'ar' ? 'وضع تجريبي' : 'Test Mode'}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground break-words">
                                  {language === 'ar'
                                    ? 'دفع إلكتروني فوري وآمن (فيزا، ماستركارد، ميزة، Apple Pay، فوري و valU)'
                                    : 'Instant secure payment (Visa, Mastercard, Meeza, Apple Pay, Fawry & valU)'}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                  <span
                                    dir="ltr"
                                    title="Visa"
                                    className="inline-flex h-6 items-center justify-center rounded bg-[#1A1F71] px-2 text-[11px] font-extrabold italic tracking-wider text-white shadow-sm ring-1 ring-white/10"
                                  >
                                    VISA
                                  </span>
                                  <span
                                    dir="ltr"
                                    title="Mastercard"
                                    aria-label="Mastercard"
                                    className="inline-flex h-6 w-9 items-center justify-center rounded bg-white px-1 shadow-sm ring-1 ring-black/15"
                                  >
                                    <span className="block h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                                    <span className="-ml-1.5 block h-3.5 w-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
                                  </span>
                                  <span
                                    title="Meeza"
                                    className="inline-flex h-6 items-center justify-center rounded bg-[#005B94] px-2 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10"
                                  >
                                    ميزة
                                  </span>
                                  <span
                                    dir="ltr"
                                    title="Apple Pay"
                                    className="inline-flex h-6 items-center justify-center gap-0.5 rounded bg-black px-2 text-[11px] font-semibold tracking-tight text-white shadow-sm ring-1 ring-white/25"
                                  >
                                    <svg className="h-3 w-3 fill-current shrink-0 -mt-[1px]" viewBox="0 0 384 512" aria-hidden="true">
                                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                                    </svg>
                                    <span>Pay</span>
                                  </span>
                                  <span
                                    dir="ltr"
                                    title="Fawry"
                                    className="inline-flex h-6 items-center justify-center rounded bg-[#FFD200] px-2 text-[11px] font-extrabold tracking-tight text-[#005596] shadow-sm ring-1 ring-black/10"
                                  >
                                    Fawry
                                  </span>
                                  <span
                                    dir="ltr"
                                    title="valU"
                                    className="inline-flex h-6 items-center justify-center rounded bg-[#00A896] px-2 text-[11px] font-extrabold tracking-tight text-white shadow-sm ring-1 ring-white/15"
                                  >
                                    valU
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* InstaPay */}
                    {instapayEnabled && (
                      <div
                        className={`relative rounded-xl border-2 transition-all min-w-0 ${
                          paymentMethod === 'instapay'
                            ? 'border-purple-600 bg-purple-500/[0.06] shadow-sm ring-1 ring-purple-600/30'
                            : 'border-border/80 hover:border-purple-400/50 bg-card hover:bg-muted/20'
                        }`}
                      >
                        <div className="relative flex items-start sm:items-center gap-3 sm:gap-3.5 p-3 sm:p-4 min-w-0">
                          <RadioGroupItem
                            value="instapay"
                            id="instapay"
                            className="relative z-10 h-5 w-5 shrink-0 mt-0.5 sm:mt-0 border-2 border-purple-600 text-purple-600"
                          />
                          <Label
                            htmlFor="instapay"
                            className="flex-1 min-w-0 cursor-pointer select-none after:content-[''] after:absolute after:inset-0"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] text-white shadow-sm">
                                  <Smartphone className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <p className="font-semibold text-foreground text-sm sm:text-base">
                                      {language === 'ar' ? 'الدفع عبر إنستاباي (InstaPay)' : 'Pay via InstaPay'}
                                    </p>
                                    <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 shrink-0">
                                      تحويل فوري
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                    {language === 'ar' ? 'تحويل لحظي مباشر عبر تطبيق إنستاباي بدون رسوم' : 'Direct instant transfer via InstaPay with zero fees'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>

                        {/* Expandable InstaPay Instructions Card */}
                        {paymentMethod === 'instapay' && (
                          <div className="px-3 pb-3 sm:px-4 sm:pb-4 min-w-0">
                            <div className="pt-4 border-t border-purple-500/20 space-y-4 min-w-0">
                              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 sm:p-4 space-y-3 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-purple-900 dark:text-purple-200 font-semibold">
                                  <span>{language === 'ar' ? 'بيانات التحويل عبر إنستاباي:' : 'InstaPay Transfer Details:'}</span>
                                  <span className="bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded font-mono font-bold text-sm shrink-0">
                                    {formatPrice(total)}
                                  </span>
                                </div>

                                {/* InstaPay Address */}
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-card p-2.5 rounded-lg border border-purple-100 dark:border-purple-900">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[11px] text-muted-foreground block">{language === 'ar' ? 'عنوان إنستاباي (IPA):' : 'InstaPay Address (IPA):'}</span>
                                    <span className="font-mono font-bold text-sm text-foreground break-all">
                                      {getInfo('payment', 'instapay_address', 'azkasmart@instapay').trim() || 'azkasmart@instapay'}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs shrink-0"
                                    onClick={() => copyToClipboard(getInfo('payment', 'instapay_address', 'azkasmart@instapay').trim() || 'azkasmart@instapay', 'ipa')}
                                  >
                                    {copiedField === 'ipa' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedField === 'ipa' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
                                  </Button>
                                </div>

                                {/* InstaPay Phone — only shown when configured non-empty */}
                                {getInfo('payment', 'instapay_phone', '').trim() && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-card p-2.5 rounded-lg border border-purple-100 dark:border-purple-900">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[11px] text-muted-foreground block">{language === 'ar' ? 'رقم الهاتف المسجل في إنستاباي:' : 'InstaPay Mobile Number:'}</span>
                                      <span className="font-mono font-bold text-sm text-foreground break-words" dir="ltr">
                                        {getInfo('payment', 'instapay_phone', '').trim()}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs shrink-0"
                                      onClick={() => copyToClipboard(getInfo('payment', 'instapay_phone', '').trim(), 'phone')}
                                    >
                                      {copiedField === 'phone' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                      {copiedField === 'phone' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
                                    </Button>
                                  </div>
                                )}

                                {/* Account Name — only shown when configured non-empty */}
                                {getInfo('payment', 'instapay_name', '').trim() && (
                                  <div className="text-xs text-muted-foreground break-words">
                                    <span>{language === 'ar' ? 'اسم الحساب:' : 'Account Name:'} </span>
                                    <strong className="text-foreground">{getInfo('payment', 'instapay_name', '').trim()}</strong>
                                  </div>
                                )}
                              </div>

                              {/* Verification Reference Input */}
                              <div className="space-y-1.5 min-w-0">
                                <Label htmlFor="instapayRef" className="text-xs font-medium block break-words">
                                  {language === 'ar' ? 'رقم العملية أو اسم / رقم المحول (للتحقق):' : 'Transfer Reference / Sender Name or Phone (for verification):'}
                                </Label>
                                <Input
                                  id="instapayRef"
                                  value={instapayReference}
                                  onChange={(e) => setInstapayReference(e.target.value)}
                                  placeholder={language === 'ar' ? 'مثال: رقم التحويل، أو اسم صاحب الحساب المحول منه...' : 'e.g. Transfer ID, or sender account name/phone...'}
                                  className="text-sm w-full"
                                />
                              </div>

                              {/* Receipt Upload */}
                              <div className="space-y-1.5 min-w-0">
                                <Label className="text-xs font-medium block break-words">
                                  {language === 'ar' ? 'إرفاق إيصال التحويل (اختياري):' : 'Attach Transfer Receipt (Optional):'}
                                </Label>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-lg cursor-pointer hover:bg-muted text-xs font-medium transition max-w-full min-w-0">
                                    <UploadCloud className="h-4 w-4 text-purple-600 shrink-0" />
                                    <span className="truncate">{instapayReceiptFile ? instapayReceiptFile.name : (language === 'ar' ? 'اختيار صورة الإيصال' : 'Choose Receipt Image')}</span>
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
                                  href={`https://wa.me/${(() => {
                                    const d = (getInfo('contact', 'whatsapp', '201501896456') || '201501896456').replace(/[^0-9]/g, '');
                                    return d.startsWith('0') ? '2' + d : (d || '201501896456');
                                  })()}?text=${encodeURIComponent(
                                    `مرحباً أزكاسمارت، أود تأكيد الدفع عبر إنستاباي بمبلغ ${total} ج.م.\nالاسم: ${formData.firstName} ${formData.lastName}\nالهاتف: ${formData.phone}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-start sm:items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium break-words"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0" />
                                  <span>{language === 'ar' ? 'أو يمكنك إرسال صورة التحويل عبر واتساب مباشرة' : 'Or send the transfer receipt via WhatsApp directly'}</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cash on Delivery */}
                    {codEnabled && (
                      <div
                        className={`relative rounded-xl border-2 transition-all min-w-0 ${
                          paymentMethod === 'cod'
                            ? 'border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/30'
                            : 'border-border/80 hover:border-primary/40 bg-card hover:bg-muted/20'
                        }`}
                      >
                        <div className="relative flex items-start sm:items-center gap-3 sm:gap-3.5 p-3 sm:p-4 min-w-0">
                          <RadioGroupItem
                            value="cod"
                            id="cod"
                            className="relative z-10 h-5 w-5 shrink-0 mt-0.5 sm:mt-0 border-2"
                          />
                          <Label
                            htmlFor="cod"
                            className="flex-1 min-w-0 cursor-pointer select-none after:content-[''] after:absolute after:inset-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Banknote className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm sm:text-base">
                                  {language === 'ar' ? 'الدفع عند الاستلام (نقداً)' : 'Cash on Delivery (COD)'}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                  {language === 'ar' ? 'ادفع نقداً عند استلام الشحنة وتأكيد الطلب' : 'Pay in cash upon delivery of your order'}
                                </p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Professional Installation */}
                <div className={cn(
                  "rounded-2xl azka-glass border p-4 sm:p-6 min-w-0",
                  isBundleOrder
                    ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent"
                    : "border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
                )}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0 flex-1">
                      <Wrench className={cn("h-5 w-5 shrink-0", isBundleOrder ? "text-emerald-500" : "text-primary")} />
                      <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground break-words">
                        {language === 'ar' ? 'التركيب الاحترافي المعتمد' : 'Certified Professional Installation'}
                      </h2>
                      {isBundleOrder && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'مجاناً مع الباقة' : 'FREE with Bundle'}
                        </span>
                      )}
                    </div>
                    <Switch checked={includeInstallation} onCheckedChange={setIncludeInstallation} className="shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 break-words">
                    {isBundleOrder
                      ? (language === 'ar'
                          ? `التركيب الاحترافي والبرمجة الكاملة للأجهزة والسيناريوهات مشمولان مجاناً بالكامل ضمن باقتك المختارة (توفر ${formatPrice(regularInstallationFee)} رسوم تركيب).`
                          : `Certified installation and full smart scene programming are included 100% FREE with your selected bundle (saving you ${formatPrice(regularInstallationFee)} in installation fees).`)
                      : (language === 'ar'
                          ? `فريقنا المعتمد يركّب أجهزتك ويهيئها لك بالكامل. رسوم التركيب: ٢٠٪ من إجمالي الأجهزة (الحد الأدنى للزيارة ١,٥٠٠ ج.م).`
                          : `Our certified team installs and configures your devices. Fee: 20% of total (minimum 1,500 EGP per visit).`)}
                  </p>
                  {includeInstallation && subtotal > 0 && (
                    <div className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 sm:px-4 py-3",
                      isBundleOrder ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-primary/10"
                    )}>
                      <span className="text-sm font-medium text-foreground min-w-0 flex-1 break-words">
                        {isBundleOrder
                          ? (language === 'ar'
                              ? 'شامل التركيب والبرمجة الميدانية المعتمدة ضمن الباقة'
                              : 'Certified on-site installation & setup included in bundle')
                          : (language === 'ar'
                              ? `٢٠٪ من الإجمالي (الحد الأدنى للزيارة ١,٥٠٠ ج.م)`
                              : `20% of total (min. 1,500 EGP visit fee)`)}
                      </span>
                      {isBundleOrder ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm azka-old-price">
                            {formatPrice(regularInstallationFee)}
                          </span>
                          <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'مجاناً' : 'FREE'}
                          </span>
                        </div>
                      ) : (
                        <span className="font-display text-lg font-bold text-primary shrink-0">
                          {formatPrice(installationFee)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Coupon Code */}
                <div className="rounded-2xl azka-glass p-4 sm:p-6 min-w-0">
                  <h2 className="mb-4 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary shrink-0" />
                    {language === 'ar' ? 'كود الخصم' : 'Coupon Code'}
                  </h2>
                  {appliedCoupon ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="font-mono font-bold text-green-600 break-all">{appliedCoupon.code}</span>
                        <span className="text-sm text-green-600 shrink-0">
                          (-{formatPrice(couponDiscount)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 min-w-0">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={language === 'ar' ? 'أدخل كود الخصم' : 'Enter coupon code'}
                        className="font-mono uppercase min-w-0 flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="shrink-0 px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {language === 'ar' ? 'تطبيق' : 'Apply'}
                        <ArrowRight className={cn("ml-1 h-3 w-3 transition-transform hover:scale-110", language === 'ar' && "rotate-180 mr-1 ml-0")} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                <div className="rounded-2xl azka-glass p-4 sm:p-6 min-w-0">
                  <h2 className="mb-4 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary shrink-0" />
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
              <div className="h-fit min-w-0 rounded-2xl azka-glass p-4 sm:p-6">
                <h2 className="mb-6 font-display text-xl font-semibold text-foreground">
                  {labels.orderSummary}
                </h2>

                {/* Items */}
                <div className="mb-6 space-y-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg azka-studio-surface p-1 flex items-center justify-center">
                        <img
                          src={item.product.image_url || '/placeholder.svg'}
                          alt={item.product.name}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          dir={getTextDirection(item.product.name)}
                          style={{ unicodeBidi: 'isolate' }}
                          className="truncate text-sm font-medium text-foreground"
                        >
                          {isolateBidiUnits(item.product.name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-foreground">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{labels.subtotal}</span>
                    <span className="font-medium text-foreground shrink-0">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{labels.shipping}</span>
                    <span className="font-medium text-foreground shrink-0">
                      {shippingCost === 0 ? labels.freeShipping : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {includeInstallation && isBundleOrder && (
                    <div className="flex flex-wrap justify-between items-center gap-2 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 min-w-0">
                        <Wrench className="h-3.5 w-3.5 shrink-0" />
                        <span>{language === 'ar' ? 'التركيب المعتمد (عرض الباقة)' : 'Installation (Bundle Offer)'}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs azka-old-price">
                          {formatPrice(regularInstallationFee)}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'مجاناً' : 'FREE'}
                        </span>
                      </div>
                    </div>
                  )}
                  {includeInstallation && !isBundleOrder && installationFee > 0 && (
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground min-w-0">
                        {language === 'ar' ? 'التركيب (٢٠٪، حد أدنى ١٥٠٠ ج.م)' : 'Installation (20%, min. 1,500 EGP)'}
                      </span>
                      <span className="font-medium text-foreground shrink-0">{formatPrice(installationFee)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-green-600 flex items-center gap-1 min-w-0">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="truncate">{appliedCoupon?.code}</span>
                      </span>
                      <span className="font-medium text-green-600 shrink-0">-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-green-600">{labels.pointsDiscount}</span>
                      <span className="font-medium text-green-600 shrink-0">-{formatPrice(pointsDiscount)}</span>
                    </div>
                  )}
                  {cardFee > 0 && (
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'رسوم الدفع بالبطاقة' : 'Card Fee'}
                      </span>
                      <span className="font-medium text-foreground shrink-0">{formatPrice(cardFee)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-display text-lg font-semibold text-foreground">
                        {labels.total}
                      </span>
                      <div className="text-right shrink-0">
                        {pointsDiscount > 0 && (
                          <span className="block text-sm azka-old-price">
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

                {paymentStatusMessage && (
                  <div
                    role="alert"
                    className={cn(
                      'mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed',
                      paymentStatusMessage.type === 'error'
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                    )}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{paymentStatusMessage.text}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="mt-6 w-full h-12 rounded-full gap-2 bg-gradient-to-r from-teal-400 to-cyan-400 text-[#070D16] hover:from-teal-300 hover:to-cyan-300 font-semibold shadow-[0_0_24px_-6px_rgba(45,212,191,0.55)] border-0" 
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
                      {paymentMethod === 'xpay' ? (
                        <>
                          <CreditCard className="h-4 w-4" />
                          {language === 'ar' ? 'الدفع بالبطاقة (XPay)' : 'Pay by card (XPay)'}
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