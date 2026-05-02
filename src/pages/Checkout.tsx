import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CreditCard, Truck, Shield, Loader2, Gift, Banknote, CheckCircle, LogIn, Wrench, Tag, X as XIcon } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PointsRedemption } from '@/components/loyalty/PointsRedemption';
import { useAuth } from '@/hooks/useAuth';
import { AuthButton } from '@/components/auth/AuthButton';
import { z } from 'zod';

// Validation schema
const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(20),
  address: z.string().trim().min(10, 'Address must be at least 10 characters').max(200),
  city: z.string().trim().min(2, 'City must be at least 2 characters').max(100),
  governorate: z.string().trim().min(2, 'Governorate is required').max(100),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

declare global {
  interface Window {
    Lightbox?: any;
    lightbox?: any;
    LightBox?: any;
  }
}

// PaySky exposes its global with inconsistent casing / nesting across SDK versions.
function getPaySkyLightbox(): any | null {
  const w = window as any;
  const namedCandidates = [w.Lightbox, w.lightbox, w.LightBox, w.PaySky, w.paysky, w.PAYSKY, w.IPG, w.Checkout];

  const tryExtract = (c: any) => {
    if (!c) return null;
    // Pattern A: obj.Checkout.configure(...)
    const inner = c.Checkout || c.checkout;
    if (inner && typeof (inner.configure || inner.Configure) === 'function') {
      return {
        configure: (inner.configure || inner.Configure).bind(inner),
        showLightbox: (inner.showLightbox || inner.ShowLightbox || inner.show)?.bind(inner),
      };
    }
    // Pattern B: obj.configure(...) directly
    if (typeof (c.configure || c.Configure) === 'function') {
      return {
        configure: (c.configure || c.Configure).bind(c),
        showLightbox: (c.showLightbox || c.ShowLightbox || c.show)?.bind(c),
      };
    }
    return null;
  };

  for (const c of namedCandidates) {
    const res = tryExtract(c);
    if (res) return res;
  }

  // Broad scan: any window property that has configure + showLightbox
  try {
    for (const key of Object.keys(w)) {
      if (['window', 'document', 'self', 'top', 'parent'].includes(key)) continue;
      const res = tryExtract(w[key]);
      if (res) return res;
    }
  } catch { /* ignore */ }

  return null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: 'percentage' | 'fixed'; discountValue: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'fawry' | 'vodafone' | 'applepay'>('card');
  const [payskyLoaded, setPayskyLoaded] = useState(false);
  const [includeInstallation, setIncludeInstallation] = useState(true);
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    governorate: '',
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

  // Load PaySky LightBox script. Port 6006 is on the browser's blocked-port list so we skip it.
  useEffect(() => {
    const probe = () => { if (getPaySkyLightbox()) { setPayskyLoaded(true); return true; } return false; };
    if (probe()) return;

    let cancelled = false;

    const urls = [
      'https://secure.paysky.io/js/LightBox.js',
      'https://cube.paysky.io/js/LightBox.js',
      'https://acceptance.paysky.io/js/LightBox.js',
    ];
    let idx = 0;
    const next = () => {
      if (cancelled || idx >= urls.length) return;
      const url = urls[idx++];
      if (document.querySelector(`script[src="${url}"]`)) {
        setTimeout(() => { if (!probe()) next(); }, 600);
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => setTimeout(() => { if (!probe()) next(); }, 600);
      s.onerror = () => setTimeout(next, 100);
      document.body.appendChild(s);
    };
    next();

    return () => { cancelled = true; };
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const subtotal = getTotal();
  const shippingCost = subtotal >= 1000 ? 0 : 50;
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

  const createOrder = async () => {
    // Create order in database
    const orderData = {
      email: formData.email,
      total: total,
      status: 'pending',
      stripe_session_id: null,
      shipping_address: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
        installation: includeInstallation ? {
          requested: true,
          fee: installationFee,
          deviceCount,
        } : { requested: false },
      },
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items — bundle items have virtual IDs so product_id is null
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id.startsWith('bundle-') ? null : item.product.id,
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
          p_order_id: order.id,
        });
      } catch (redeemError) {
        console.warn('Could not redeem loyalty points:', redeemError);
      }
    }

    // Award loyalty points
    try {
      await supabase.rpc('award_loyalty_points', {
        p_email: formData.email,
        p_order_id: order.id,
        p_order_total: total,
      });
    } catch (loyaltyError) {
      console.warn('Could not award loyalty points:', loyaltyError);
    }

    // Coupon usage tracking is handled via admin reports — public increment was removed
    // to prevent abuse (anyone could exhaust max_uses by replaying the request).

    // Send order notification email
    try {
      await supabase.functions.invoke('send-order-notification', {
        body: {
          orderId: order.id,
          email: formData.email,
          total: total,
          paymentMethod: paymentMethod,
          items: orderItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingAddress: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            governorate: formData.governorate,
          },
        },
      });
    } catch (emailError) {
      console.warn('Could not send order notification:', emailError);
    }

    return order;
  };

  const handlePaySkyPayment = async () => {
    try {
      // Get PaySky configuration from edge function
      const { data, error } = await supabase.functions.invoke('paysky-checkout', {
        body: {
          orderId: `order_${Date.now()}`,
          amount: total,
          merchantReference: `BZ_${Date.now()}`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to initialize payment');
      }

      const config = data.config;

      // Configure and show PaySky LightBox (handles SDK casing differences)
      const lightbox = getPaySkyLightbox();
      if (lightbox && typeof lightbox.configure === 'function') {
        lightbox.configure({
          MID: config.MID,
          TID: config.TID,
          AmountTrxn: config.AmountTrxn,
          MerchantReference: config.MerchantReference,
          TrxDateTime: config.TrxDateTime,
          SecureHash: config.SecureHash,
          completeCallback: async (response: any) => {
            console.log('Payment complete:', response);
            if (response.Success) {
              const order = await createOrder();
              await supabase
                .from('orders')
                .update({ stripe_session_id: response.TransactionNo || config.MerchantReference })
                .eq('id', order.id);

              toast({
                title: language === 'ar' ? 'تم الدفع بنجاح' : 'Payment Successful',
                description: language === 'ar' ? 'تم إتمام طلبك بنجاح' : 'Your order has been placed successfully',
              });

              clearCart();
              navigate(`/order-confirmation?orderId=${order.id}`);
            } else {
              toast({
                variant: 'destructive',
                title: language === 'ar' ? 'فشل الدفع' : 'Payment Failed',
                description: response.Message || 'Payment was not successful',
              });
            }
            setIsProcessing(false);
          },
          errorCallback: (error: any) => {
            console.error('Payment error:', error);
            toast({
              variant: 'destructive',
              title: language === 'ar' ? 'خطأ في الدفع' : 'Payment Error',
              description: error?.Message || 'An error occurred during payment',
            });
            setIsProcessing(false);
          },
          cancelCallback: () => {
            toast({
              title: language === 'ar' ? 'تم إلغاء الدفع' : 'Payment Cancelled',
              description: language === 'ar' ? 'يمكنك المحاولة مرة أخرى' : 'You can try again',
            });
            setIsProcessing(false);
          },
        });

        if (typeof lightbox.showLightbox === 'function') {
          lightbox.showLightbox();
        } else {
          throw new Error('PaySky LightBox cannot be displayed');
        }
      } else {
        toast({
          variant: 'destructive',
          title: language === 'ar' ? 'بوابة الدفع غير متاحة' : 'Payment gateway unavailable',
          description: language === 'ar'
            ? 'حاول مرة أخرى لاحقاً'
            : 'Please try again later',
        });
        throw new Error('PaySky LightBox not loaded');
      }
    } catch (error: any) {
      console.error('PaySky error:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || 'Failed to initialize payment',
      });
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof CheckoutFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'card') {
        // Process card payment via PaySky
        await handlePaySkyPayment();
      } else {
        // Cash on Delivery - create order directly
        const order = await createOrder();

        toast({
          title: language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order Created Successfully',
          description: language === 'ar' 
            ? 'سيتم التواصل معك لتأكيد الطلب'
            : 'We will contact you to confirm the order',
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
    cardPayment: language === 'ar' ? 'بطاقة ائتمان / مدى' : 'Credit / Debit Card',
    pointsDiscount: language === 'ar' ? 'خصم النقاط' : 'Points Discount',
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{`${labels.checkout} | Baytzaki`}</title>
      </Helmet>
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
                      <Input
                        id="governorate"
                        name="governorate"
                        value={formData.governorate}
                        onChange={handleInputChange}
                        className={errors.governorate ? 'border-destructive' : ''}
                      />
                      {errors.governorate && (
                        <p className="text-sm text-destructive">{errors.governorate}</p>
                      )}
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
                                {language === 'ar' ? 'دفع آمن عبر PaySky' : 'Secure payment via PaySky'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Fawry - Coming Soon */}
                    <div 
                      className="flex items-center space-x-4 p-4 rounded-lg border-2 border-border opacity-60 cursor-not-allowed relative"
                    >
                      <RadioGroupItem value="fawry" id="fawry" disabled />
                      <Label htmlFor="fawry" className="flex-1 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{language === 'ar' ? 'فوري' : 'Fawry'}</p>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? 'ادفع عبر منافذ فوري' : 'Pay at Fawry outlets'}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            {language === 'ar' ? 'قريباً' : 'Soon'}
                          </span>
                        </div>
                      </Label>
                    </div>

                    {/* Vodafone Cash - Coming Soon */}
                    <div 
                      className="flex items-center space-x-4 p-4 rounded-lg border-2 border-border opacity-60 cursor-not-allowed relative"
                    >
                      <RadioGroupItem value="vodafone" id="vodafone" disabled />
                      <Label htmlFor="vodafone" className="flex-1 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{language === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}</p>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? 'ادفع عبر محفظة فودافون كاش' : 'Pay via Vodafone Cash wallet'}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            {language === 'ar' ? 'قريباً' : 'Soon'}
                          </span>
                        </div>
                      </Label>
                    </div>

                    {/* Apple Pay / Google Pay - Coming Soon */}
                    <div 
                      className="flex items-center space-x-4 p-4 rounded-lg border-2 border-border opacity-60 cursor-not-allowed relative"
                    >
                      <RadioGroupItem value="applepay" id="applepay" disabled />
                      <Label htmlFor="applepay" className="flex-1 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Apple Pay / Google Pay</p>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? 'دفع سريع عبر الهاتف' : 'Express mobile payment'}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            {language === 'ar' ? 'قريباً' : 'Soon'}
                          </span>
                        </div>
                      </Label>
                    </div>
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
