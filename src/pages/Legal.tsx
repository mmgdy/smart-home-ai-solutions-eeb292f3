import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/lib/i18n';

type PolicyKey = 'terms' | 'privacy' | 'refund' | 'shipping' | 'warranty';

const policies: Record<PolicyKey, { titleEn: string; titleAr: string; contentEn: string; contentAr: string }> = {
  terms: {
    titleEn: 'Terms & Conditions',
    titleAr: 'الشروط والأحكام',
    contentEn: `
# Terms & Conditions

**Last Updated: February 2026**

## 1. General
These Terms and Conditions govern your use of the Baytzaki website (baytzaki.com) and the purchase of products and services from our platform. By accessing this website or placing an order, you agree to these terms.

## 2. Company Information
Baytzaki is a smart home products and solutions provider operating in Egypt. All transactions are conducted in Egyptian Pounds (EGP).

## 3. Products & Pricing
- All prices are listed in Egyptian Pounds (EGP) and include applicable taxes unless otherwise stated.
- We reserve the right to change prices at any time without prior notice.
- Product availability is subject to stock levels and may change without notice.
- Product images are for illustration purposes. Actual products may vary slightly.

## 4. Orders & Payment
- An order is confirmed only after successful payment processing.
- We accept Cash on Delivery (COD), credit/debit cards via PaySky, and other payment methods as listed at checkout.
- We reserve the right to cancel orders if we suspect fraud or if products are out of stock.

## 5. Account Registration
- You are responsible for maintaining the confidentiality of your account.
- You must provide accurate and complete information when creating an account.
- You are responsible for all activities under your account.

## 6. Intellectual Property
All content on this website, including logos, product images, text, and design, is owned by Baytzaki and is protected by intellectual property laws.

## 7. Limitation of Liability
Baytzaki shall not be liable for indirect, incidental, or consequential damages arising from the use of our products or services, to the maximum extent permitted by Egyptian law.

## 8. Governing Law
These terms are governed by the laws of the Arab Republic of Egypt.

## 9. Contact
For any questions regarding these terms, please contact us at info@baytzaki.com.
    `,
    contentAr: `
# الشروط والأحكام

**آخر تحديث: فبراير 2026**

## 1. عام
تحكم هذه الشروط والأحكام استخدامك لموقع بايتزاكي (baytzaki.com) وشراء المنتجات والخدمات من منصتنا. بالدخول إلى هذا الموقع أو تقديم طلب، فإنك توافق على هذه الشروط.

## 2. معلومات الشركة
بايتزاكي هي مزود منتجات وحلول المنزل الذكي وتعمل في مصر. تتم جميع المعاملات بالجنيه المصري.

## 3. المنتجات والأسعار
- جميع الأسعار مدرجة بالجنيه المصري وتشمل الضرائب المطبقة ما لم يُذكر خلاف ذلك.
- نحتفظ بالحق في تغيير الأسعار في أي وقت دون إشعار مسبق.
- توفر المنتجات يخضع لمستويات المخزون وقد يتغير دون إشعار.

## 4. الطلبات والدفع
- يتم تأكيد الطلب فقط بعد معالجة الدفع بنجاح.
- نقبل الدفع عند الاستلام وبطاقات الائتمان/الخصم عبر PaySky.
- نحتفظ بالحق في إلغاء الطلبات إذا اشتبهنا في الاحتيال أو نفاد المنتجات.

## 5. تسجيل الحساب
- أنت مسؤول عن الحفاظ على سرية حسابك.
- يجب تقديم معلومات دقيقة وكاملة عند إنشاء حساب.

## 6. الملكية الفكرية
جميع المحتويات على هذا الموقع محمية بقوانين الملكية الفكرية.

## 7. القانون الحاكم
تخضع هذه الشروط لقوانين جمهورية مصر العربية.

## 8. التواصل
لأي أسئلة تتعلق بهذه الشروط، يرجى التواصل معنا على info@baytzaki.com.
    `,
  },
  privacy: {
    titleEn: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    contentEn: `
# Privacy Policy

**Last Updated: February 2026**

## 1. Information We Collect
We collect information you provide directly, including:
- Name, email address, phone number
- Shipping and billing addresses
- Payment information (processed securely via PaySky)
- Order history and preferences

## 2. How We Use Your Information
- Processing and fulfilling orders
- Communicating order updates and shipping status
- Providing customer support
- Sending promotional offers (with your consent)
- Improving our products and services
- Loyalty points tracking and rewards

## 3. Data Protection
- We use industry-standard SSL encryption for all data transmission.
- Payment data is processed securely through PaySky and is never stored on our servers.
- Access to personal data is restricted to authorized personnel only.

## 4. Cookies
We use cookies to improve your browsing experience, remember your preferences, and analyze website traffic.

## 5. Third-Party Services
We may share your data with trusted partners for order fulfillment, payment processing, and delivery services. These partners are bound by data protection agreements.

## 6. Your Rights
You have the right to:
- Access your personal data
- Correct inaccurate information
- Request deletion of your data
- Opt out of marketing communications

## 7. Data Retention
We retain your data for as long as your account is active or as needed for legal and business purposes.

## 8. Contact
For privacy concerns, contact us at info@baytzaki.com.
    `,
    contentAr: `
# سياسة الخصوصية

**آخر تحديث: فبراير 2026**

## 1. المعلومات التي نجمعها
نجمع المعلومات التي تقدمها مباشرة، بما في ذلك:
- الاسم، البريد الإلكتروني، رقم الهاتف
- عناوين الشحن والفوترة
- معلومات الدفع (تتم معالجتها بأمان عبر PaySky)
- سجل الطلبات والتفضيلات

## 2. كيف نستخدم معلوماتك
- معالجة وتنفيذ الطلبات
- إرسال تحديثات الطلبات وحالة الشحن
- تقديم دعم العملاء
- إرسال العروض الترويجية (بموافقتك)
- تحسين منتجاتنا وخدماتنا

## 3. حماية البيانات
- نستخدم تشفير SSL لجميع عمليات نقل البيانات.
- يتم معالجة بيانات الدفع بأمان من خلال PaySky.
- الوصول إلى البيانات الشخصية مقيد بالموظفين المصرح لهم فقط.

## 4. حقوقك
لديك الحق في الوصول إلى بياناتك الشخصية وتصحيحها وطلب حذفها.

## 5. التواصل
لأي مخاوف تتعلق بالخصوصية، تواصل معنا على info@baytzaki.com.
    `,
  },
  refund: {
    titleEn: 'Refund & Return Policy',
    titleAr: 'سياسة الإرجاع والاسترداد',
    contentEn: `
# Refund & Return Policy

**Last Updated: February 2026**

## 1. Return Period
You may return products within **14 days** of delivery, provided the items are in their original condition and packaging.

## 2. Conditions for Returns
- Products must be unused, undamaged, and in original packaging
- All accessories, manuals, and included items must be returned
- Products must not have been installed (unless defective)
- Proof of purchase (order confirmation or invoice) is required

## 3. Non-Returnable Items
- Products that have been installed and used
- Products damaged by the customer
- Products without original packaging
- Custom or special-order items

## 4. Return Process
1. Contact us at info@baytzaki.com with your order number
2. We will provide return instructions
3. Ship the product back in its original packaging
4. Refund will be processed within 7-14 business days after we receive and inspect the item

## 5. Refund Method
- Refunds are processed to the original payment method
- Cash on Delivery orders will be refunded via bank transfer
- Shipping costs are non-refundable unless the return is due to our error

## 6. Defective Products
If you receive a defective product, contact us within 48 hours of delivery. We will arrange a free pickup and replacement or full refund.

## 7. Warranty Claims
For products under warranty, please refer to our Warranty Policy for details on coverage and claims process.
    `,
    contentAr: `
# سياسة الإرجاع والاسترداد

**آخر تحديث: فبراير 2026**

## 1. فترة الإرجاع
يمكنك إرجاع المنتجات خلال **14 يومًا** من التسليم، بشرط أن تكون المنتجات في حالتها وتغليفها الأصلي.

## 2. شروط الإرجاع
- يجب أن تكون المنتجات غير مستخدمة وغير تالفة وفي تغليفها الأصلي
- يجب إرجاع جميع الملحقات والأدلة
- يجب عدم تركيب المنتجات (ما لم تكن معيبة)
- مطلوب إثبات الشراء

## 3. المنتجات غير القابلة للإرجاع
- المنتجات التي تم تركيبها واستخدامها
- المنتجات التالفة من قبل العميل
- المنتجات بدون تغليف أصلي

## 4. عملية الإرجاع
1. تواصل معنا على info@baytzaki.com مع رقم طلبك
2. سنقدم تعليمات الإرجاع
3. سيتم معالجة الاسترداد خلال 7-14 يوم عمل

## 5. المنتجات المعيبة
إذا استلمت منتجًا معيبًا، تواصل معنا خلال 48 ساعة من التسليم.
    `,
  },
  shipping: {
    titleEn: 'Shipping Policy',
    titleAr: 'سياسة الشحن',
    contentEn: `
# Shipping Policy

**Last Updated: February 2026**

## 1. Shipping Coverage
We deliver across Egypt, covering all governorates including:
- Greater Cairo (Cairo, Giza, 6th of October)
- Alexandria
- Delta region
- Upper Egypt
- Red Sea & Sinai regions

## 2. Shipping Methods & Times
| Region | Delivery Time | Cost |
|--------|--------------|------|
| Greater Cairo | 1-3 business days | Calculated at checkout |
| Alexandria | 2-4 business days | Calculated at checkout |
| Other Governorates | 3-7 business days | Calculated at checkout |

## 3. Free Shipping
Free shipping is available on orders over **EGP 5,000** within Greater Cairo.

## 4. Order Processing
- Orders are processed within 1-2 business days
- You will receive an email confirmation with tracking information
- Business days are Sunday through Thursday

## 5. Delivery
- Delivery is made to the address provided during checkout
- Someone must be available to receive the delivery
- For large or heavy items, delivery is to the ground floor unless otherwise arranged

## 6. Installation Delivery
For products with installation service:
- Our technician will coordinate a suitable installation date
- Installation typically occurs within 3-5 business days after delivery
- You will be contacted to schedule the installation appointment

## 7. Tracking
You will receive tracking information via email and/or WhatsApp once your order is shipped.

## 8. Contact
For shipping inquiries, contact us at info@baytzaki.com.
    `,
    contentAr: `
# سياسة الشحن

**آخر تحديث: فبراير 2026**

## 1. تغطية الشحن
نوصل في جميع أنحاء مصر، بما في ذلك:
- القاهرة الكبرى
- الإسكندرية
- الدلتا
- صعيد مصر

## 2. طرق الشحن والمدة
| المنطقة | مدة التوصيل | التكلفة |
|---------|------------|--------|
| القاهرة الكبرى | 1-3 أيام عمل | تحسب عند الدفع |
| الإسكندرية | 2-4 أيام عمل | تحسب عند الدفع |
| محافظات أخرى | 3-7 أيام عمل | تحسب عند الدفع |

## 3. الشحن المجاني
الشحن المجاني متاح للطلبات التي تتجاوز **5,000 ج.م** داخل القاهرة الكبرى.

## 4. معالجة الطلبات
- تتم معالجة الطلبات خلال 1-2 يوم عمل
- ستتلقى تأكيدًا بالبريد الإلكتروني مع معلومات التتبع

## 5. التواصل
لاستفسارات الشحن، تواصل معنا على info@baytzaki.com.
    `,
  },
  warranty: {
    titleEn: 'Warranty Policy',
    titleAr: 'سياسة الضمان',
    contentEn: `
# Warranty Policy

**Last Updated: February 2026**

## 1. Warranty Coverage
All products sold by Baytzaki come with the manufacturer's warranty. Warranty periods vary by brand:

| Brand | Warranty Period |
|-------|----------------|
| SONOFF | 1 year |
| MOES | 1 year |
| TP-Link | 2 years |
| Akubela | 2 years |
| Other brands | As specified by manufacturer |

## 2. What's Covered
- Manufacturing defects
- Hardware malfunctions under normal use
- Firmware/software issues (within the warranty period)

## 3. What's NOT Covered
- Damage from improper installation (unless installed by Baytzaki)
- Physical damage (drops, water, fire, power surges)
- Modification or tampering
- Normal wear and tear
- Damage from using non-compatible accessories

## 4. Warranty Claim Process
1. Contact us at info@baytzaki.com with:
   - Order number
   - Product name and serial number
   - Description of the issue
   - Photos/videos of the defect
2. Our support team will evaluate your claim within 48 hours
3. If approved, we will arrange pickup or provide return instructions
4. Replacement or repair will be completed within 7-14 business days

## 5. Installation Warranty
Products installed by Baytzaki technicians include an additional **6-month installation warranty** covering:
- Wiring and connection issues
- Configuration errors
- Integration problems with other smart home devices

## 6. Extended Warranty
Extended warranty plans may be available for select products. Ask our team for details.

## 7. Contact
For warranty claims, contact info@baytzaki.com or WhatsApp us.
    `,
    contentAr: `
# سياسة الضمان

**آخر تحديث: فبراير 2026**

## 1. تغطية الضمان
جميع المنتجات المباعة من بايتزاكي تأتي مع ضمان الشركة المصنعة.

| العلامة التجارية | فترة الضمان |
|-----------------|------------|
| SONOFF | سنة واحدة |
| MOES | سنة واحدة |
| TP-Link | سنتان |
| Akubela | سنتان |

## 2. ما يغطيه الضمان
- عيوب التصنيع
- أعطال الأجهزة في ظل الاستخدام العادي

## 3. ما لا يغطيه الضمان
- الأضرار الناتجة عن التركيب غير السليم
- الأضرار المادية
- التعديل أو العبث

## 4. عملية المطالبة بالضمان
1. تواصل معنا على info@baytzaki.com مع رقم الطلب ووصف المشكلة
2. سيقيم فريق الدعم مطالبتك خلال 48 ساعة
3. سيتم الاستبدال أو الإصلاح خلال 7-14 يوم عمل

## 5. ضمان التركيب
المنتجات المركبة بواسطة فنيي بايتزاكي تشمل ضمان تركيب إضافي لمدة **6 أشهر**.

## 6. التواصل
لمطالبات الضمان، تواصل معنا على info@baytzaki.com.
    `,
  },
};

const Legal = () => {
  const { page } = useParams<{ page: string }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const policyKey = page as PolicyKey;
  const policy = policies[policyKey];

  if (!policy) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="mb-4 font-display text-2xl font-bold text-foreground">Page Not Found</h1>
          <Link to="/" className="text-primary hover:underline">Go Home</Link>
        </div>
      </Layout>
    );
  }

  const title = isRTL ? policy.titleAr : policy.titleEn;
  const content = isRTL ? policy.contentAr : policy.contentEn;

  return (
    <>
      <Helmet>
        <title>{title} | Baytzaki</title>
        <meta name="description" content={`${title} for Baytzaki smart home products store.`} />
      </Helmet>
      <Layout>
        <div className="container max-w-4xl py-24 md:py-28">
          <article
            className="prose prose-invert prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary max-w-none"
            dangerouslySetInnerHTML={{
              __html: content
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\- (.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
                .replace(/\n{2,}/g, '</p><p>')
                .replace(/\|(.+)\|/g, (match) => {
                  const cells = match.split('|').filter(Boolean).map(c => c.trim());
                  return `<tr>${cells.map(c => c.match(/^[-]+$/) ? '' : `<td class="border border-border px-3 py-2">${c}</td>`).join('')}</tr>`;
                })
                .replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full border-collapse border border-border my-4">$&</table>')
                .replace(/<tr><\/tr>/g, '')
            }}
          />

          {/* Quick links to other policies */}
          <div className="mt-12 border-t border-border pt-8">
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              {isRTL ? 'سياسات أخرى' : 'Other Policies'}
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(policies)
                .filter(([key]) => key !== policyKey)
                .map(([key, val]) => (
                  <Link
                    key={key}
                    to={`/legal/${key}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    {isRTL ? val.titleAr : val.titleEn}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Legal;
