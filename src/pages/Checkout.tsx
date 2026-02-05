import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CreditCard, Truck, Shield, Loader2, Gift, Banknote, CheckCircle, LogIn } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    Lightbox?: {
      Checkout: {
        configure: (config: any) => void;
        showLightbox: () => void;
      };
    };
  }
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
  const [payskyLoaded, setPayskyLoaded] = useState(false);
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

  // Load PaySky LightBox script
  useEffect(() => {
    if (paymentMethod !== 'card') return;
    
    // Use production URL
    const scriptUrl = 'https://cube.paysky.io:6006/js/LightBox.js';
    
    // Check if already loaded
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) {
      setPayskyLoaded(!!window.Lightbox);
      return;
    }
    
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setPayskyLoaded(true);
    script.onerror = () => {
      console.warn('PaySky LightBox script failed to load from production, trying test URL...');
      // Fallback to test URL
      const fallback = document.createElement('script');
      fallback.src = 'https://grey.paysky.io:9006/invchost/JS/LightBox.js';
      fallback.async = true;
      fallback.onload = () => setPayskyLoaded(true);
      fallback.onerror = () => {
        console.error('PaySky LightBox failed to load from both URLs');
        setPayskyLoaded(false);
      };
      document.body.appendChild(fallback);
    };
    document.body.appendChild(script);
  }, [paymentMethod]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const subtotal = getTotal();
  const shippingCost = subtotal >= 1000 ? 0 : 50;
  const totalBeforeDiscount = subtotal + shippingCost;
  const total = Math.max(0, totalBeforeDiscount - pointsDiscount);

  const handleRedemptionChange = (discount: number, points: number) => {
    setPointsDiscount(discount);
    setPointsToRedeem(points);
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
      stripe_session_id: paymentMethod === 'cod' ? `cod_${Date.now()}` : null,
      shipping_address: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
      },
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
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

      // Configure and show PaySky LightBox
      if (window.Lightbox) {
        window.Lightbox.Checkout.configure({
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
              // Update order with payment reference
              await supabase
                .from('orders')
                .update({ stripe_session_id: response.TransactionNo || config.MerchantReference })
                .eq('id', order.id);

              toast({
                title: language === 'ar' ? 'تم الدفع بنجاح' : 'Payment Successful',
                description: language === 'ar' 
                  ? 'تم إتمام طلبك بنجاح'
                  : 'Your order has been placed successfully',
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
            console.log('Payment cancelled');
            toast({
              title: language === 'ar' ? 'تم إلغاء الدفع' : 'Payment Cancelled',
              description: language === 'ar' 
                ? 'يمكنك المحاولة مرة أخرى'
                : 'You can try again',
            });
            setIsProcessing(false);
          },
        });

        window.Lightbox.Checkout.showLightbox();
      } else {
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
    cashOnDelivery: language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery',
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
                {/* SSO Login Banner */}
                {!user && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <LogIn className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {language === 'ar' ? 'سجّل الدخول لجمع النقاط' : 'Sign in to earn rewards'}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {language === 'ar'
                        ? 'سجّل الدخول بحساب جوجل لجمع نقاط الولاء واستبدالها بخصومات على طلباتك القادمة'
                        : 'Sign in with Google to earn loyalty points and redeem them for discounts on future orders'}
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
                    onValueChange={(value) => setPaymentMethod(value as 'card' | 'cod')}
                    className="space-y-4"
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

                    {/* Cash on Delivery */}
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
                        <div className="flex items-center gap-3">
                          <Banknote className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{labels.cashOnDelivery}</p>
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? 'ادفع نقداً عند استلام الطلب' : 'Pay cash when you receive your order'}
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
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
                        {item.product.image_url && (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
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
