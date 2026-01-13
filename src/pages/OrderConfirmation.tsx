import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Package, Truck, MapPin, Mail, Phone, ArrowRight, ArrowLeft, Copy, Check } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderDetails {
  id: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    governorate: string;
  };
  items: {
    id: string;
    product_name: string;
    quantity: number;
    price: number;
  }[];
}

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { formatPrice, isRTL, language } = useLanguage();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const NextArrow = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderData) {
          setLoading(false);
          return;
        }

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        setOrder({
          ...orderData,
          shipping_address: orderData.shipping_address as OrderDetails['shipping_address'],
          items: itemsData || [],
        });
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      toast({
        title: language === 'ar' ? 'تم النسخ' : 'Copied',
        description: language === 'ar' ? 'تم نسخ رقم الطلب' : 'Order ID copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const labels = {
    orderConfirmed: language === 'ar' ? 'تم تأكيد الطلب!' : 'Order Confirmed!',
    thankYou: language === 'ar' ? 'شكراً لطلبك' : 'Thank you for your order',
    orderNumber: language === 'ar' ? 'رقم الطلب' : 'Order Number',
    orderDate: language === 'ar' ? 'تاريخ الطلب' : 'Order Date',
    orderStatus: language === 'ar' ? 'حالة الطلب' : 'Order Status',
    pending: language === 'ar' ? 'قيد الانتظار' : 'Pending',
    processing: language === 'ar' ? 'قيد المعالجة' : 'Processing',
    shipped: language === 'ar' ? 'تم الشحن' : 'Shipped',
    delivered: language === 'ar' ? 'تم التسليم' : 'Delivered',
    orderDetails: language === 'ar' ? 'تفاصيل الطلب' : 'Order Details',
    shippingAddress: language === 'ar' ? 'عنوان الشحن' : 'Shipping Address',
    orderSummary: language === 'ar' ? 'ملخص الطلب' : 'Order Summary',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    whatHappensNext: language === 'ar' ? 'ماذا بعد؟' : 'What happens next?',
    step1Title: language === 'ar' ? 'تأكيد الدفع' : 'Payment Confirmation',
    step1Desc: language === 'ar' ? 'سيتم التواصل معك عبر الهاتف لإتمام الدفع' : 'We will contact you by phone to complete the payment',
    step2Title: language === 'ar' ? 'تجهيز الطلب' : 'Order Processing',
    step2Desc: language === 'ar' ? 'سنقوم بتجهيز طلبك للشحن' : 'We will prepare your order for shipping',
    step3Title: language === 'ar' ? 'الشحن والتوصيل' : 'Shipping & Delivery',
    step3Desc: language === 'ar' ? 'سيصلك طلبك خلال 3-5 أيام عمل' : 'Your order will arrive within 3-5 business days',
    continueShopping: language === 'ar' ? 'متابعة التسوق' : 'Continue Shopping',
    orderNotFound: language === 'ar' ? 'الطلب غير موجود' : 'Order Not Found',
    orderNotFoundDesc: language === 'ar' ? 'لم نتمكن من العثور على تفاصيل هذا الطلب' : 'We could not find the details for this order',
    backToHome: language === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
    contactInfo: language === 'ar' ? 'معلومات التواصل' : 'Contact Information',
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return labels.pending;
      case 'processing': return labels.processing;
      case 'shipped': return labels.shipped;
      case 'delivered': return labels.delivered;
      default: return status;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <>
        <Helmet>
          <title>{`${labels.orderNotFound} | Baytzaki`}</title>
        </Helmet>
        <Layout>
          <div className="container py-20 text-center">
            <div className="mx-auto max-w-md">
              <Package className="mx-auto mb-6 h-16 w-16 text-muted-foreground" />
              <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
                {labels.orderNotFound}
              </h1>
              <p className="mb-8 text-muted-foreground">
                {labels.orderNotFoundDesc}
              </p>
              <Link to="/">
                <Button className="gap-2">
                  {labels.backToHome}
                  <NextArrow className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${labels.orderConfirmed} | Baytzaki`}</title>
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12">
          {/* Success Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              {labels.orderConfirmed}
            </h1>
            <p className="text-lg text-muted-foreground">{labels.thankYou}</p>
          </div>

          <div className="mx-auto max-w-4xl">
            {/* Order Info Card */}
            <div className="mb-8 rounded-xl border border-border bg-card p-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">{labels.orderNumber}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-sm font-medium text-foreground">
                      {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <button
                      onClick={copyOrderId}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{labels.orderDate}</p>
                  <p className="mt-1 font-medium text-foreground">
                    {new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{labels.orderStatus}</p>
                  <span className="mt-1 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Order Items */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {labels.orderSummary}
                </h2>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t border-border pt-4">
                  <span className="font-display text-lg font-semibold text-foreground">{labels.total}</span>
                  <span className="font-display text-xl font-bold text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Shipping & Contact Info */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 font-display text-lg font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {labels.shippingAddress}
                  </h2>
                  <div className="space-y-2 text-foreground">
                    <p className="font-medium">
                      {order.shipping_address.firstName} {order.shipping_address.lastName}
                    </p>
                    <p>{order.shipping_address.address}</p>
                    <p>{order.shipping_address.city}, {order.shipping_address.governorate}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="mb-4 font-display text-lg font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    {labels.contactInfo}
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{order.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{order.shipping_address.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 font-display text-lg font-semibold text-foreground">
                {labels.whatHappensNext}
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{labels.step1Title}</h3>
                    <p className="text-sm text-muted-foreground">{labels.step1Desc}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{labels.step2Title}</h3>
                    <p className="text-sm text-muted-foreground">{labels.step2Desc}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{labels.step3Title}</h3>
                    <p className="text-sm text-muted-foreground">{labels.step3Desc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Shopping */}
            <div className="mt-8 text-center">
              <Link to="/products">
                <Button size="lg" className="gap-2 glow-primary">
                  {labels.continueShopping}
                  <NextArrow className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default OrderConfirmation;
