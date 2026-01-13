import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CreditCard, Truck, Shield, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL, language } = useLanguage();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    governorate: '',
  });

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const subtotal = getTotal();
  const shippingCost = subtotal >= 1000 ? 0 : 50; // Free shipping over 1000 EGP
  const total = subtotal + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name as keyof CheckoutFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
      // Create order in database
      const orderData = {
        email: formData.email,
        total: total,
        status: 'pending',
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

      // Success - redirect to confirmation page
      toast({
        title: language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order Created Successfully',
        description: language === 'ar' 
          ? 'سيتم التواصل معك قريباً لإتمام الدفع'
          : 'We will contact you soon to complete the payment',
      });

      clearCart();
      navigate(`/order-confirmation?orderId=${order.id}`);

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.'
          : 'An error occurred while creating your order. Please try again.',
      });
    } finally {
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
    securePayment: language === 'ar' ? 'دفع آمن' : 'Secure Payment',
    fastDelivery: language === 'ar' ? 'توصيل سريع' : 'Fast Delivery',
    paymentNote: language === 'ar' 
      ? 'سيتم التواصل معك لإتمام الدفع عبر PaySky'
      : 'You will be contacted to complete payment via PaySky',
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

                {/* Payment Info */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 font-display text-xl font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {labels.securePayment}
                  </h2>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">PaySky</p>
                      <p className="text-sm text-muted-foreground">{labels.paymentNote}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-8" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8" />
                    <img src="https://www.meezadigital.com.eg/wp-content/uploads/2019/10/logo.png" alt="Meeza" className="h-8" />
                  </div>
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

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-display text-lg font-semibold text-foreground">
                        {labels.total}
                      </span>
                      <span className="font-display text-xl font-bold text-foreground">
                        {formatPrice(total)}
                      </span>
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
                      {labels.placeOrder}
                      <CreditCard className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
};

export default Checkout;
