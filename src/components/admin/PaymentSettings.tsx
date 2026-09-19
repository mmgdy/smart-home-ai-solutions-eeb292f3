import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Eye, 
  EyeOff, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { refreshSiteInfo } from '@/hooks/useSiteInfo';

interface Props {
  adminToken?: string;
}

interface PaymentConfig {
  // PaySky
  paysky_mid: string;
  paysky_tid: string;
  paysky_secret_key: string;
  paysky_enabled: boolean;
  // InstaPay
  instapay_address: string;
  instapay_phone: string;
  instapay_name: string;
  instapay_instructions_ar: string;
  instapay_instructions_en: string;
  instapay_enabled: boolean;
  // Cash on Delivery
  cod_enabled: boolean;
  cod_fee: string;
}

export function PaymentSettings({ adminToken }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [config, setConfig] = useState<PaymentConfig>({
    paysky_mid: '8386003528',
    paysky_tid: '93655786',
    paysky_secret_key: '80814719f6d488f83e9c1f655423349a',
    paysky_enabled: true,
    instapay_address: 'azkasmart@instapay',
    instapay_phone: '01050627310',
    instapay_name: 'AzkaSmart',
    instapay_instructions_ar: '',
    instapay_instructions_en: '',
    instapay_enabled: true,
    cod_enabled: true,
    cod_fee: '0',
  });

  // Fetch current payment configurations from site_info
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_info')
          .select('key, value')
          .eq('section', 'payment');

        if (!error && data) {
          const map: Record<string, string> = {};
          data.forEach(item => {
            map[item.key] = item.value;
          });

          setConfig(prev => ({
            ...prev,
            paysky_mid: map['paysky_mid'] ?? prev.paysky_mid,
            paysky_tid: map['paysky_tid'] ?? prev.paysky_tid,
            paysky_secret_key: map['paysky_secret_key'] ?? prev.paysky_secret_key,
            paysky_enabled: map['paysky_enabled'] !== 'false',
            instapay_address: map['instapay_address'] ?? prev.instapay_address,
            instapay_phone: map['instapay_phone'] ?? prev.instapay_phone,
            instapay_name: map['instapay_name'] ?? prev.instapay_name,
            instapay_instructions_ar: map['instapay_instructions_ar'] ?? prev.instapay_instructions_ar,
            instapay_instructions_en: map['instapay_instructions_en'] ?? prev.instapay_instructions_en,
            instapay_enabled: map['instapay_enabled'] !== 'false',
            cod_enabled: map['cod_enabled'] !== 'false',
            cod_fee: map['cod_fee'] ?? prev.cod_fee,
          }));
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentSettings();
  }, []);

  // Save all settings to site_info
  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [
        { section: 'payment', key: 'paysky_mid', value: config.paysky_mid.trim() },
        { section: 'payment', key: 'paysky_tid', value: config.paysky_tid.trim() },
        { section: 'payment', key: 'paysky_secret_key', value: config.paysky_secret_key.trim() },
        { section: 'payment', key: 'paysky_enabled', value: String(config.paysky_enabled) },
        { section: 'payment', key: 'instapay_address', value: config.instapay_address.trim() },
        { section: 'payment', key: 'instapay_phone', value: config.instapay_phone.trim() },
        { section: 'payment', key: 'instapay_name', value: config.instapay_name.trim() },
        { section: 'payment', key: 'instapay_instructions_ar', value: config.instapay_instructions_ar.trim() },
        { section: 'payment', key: 'instapay_instructions_en', value: config.instapay_instructions_en.trim() },
        { section: 'payment', key: 'instapay_enabled', value: String(config.instapay_enabled) },
        { section: 'payment', key: 'cod_enabled', value: String(config.cod_enabled) },
        { section: 'payment', key: 'cod_fee', value: config.cod_fee.trim() },
      ];

      if (adminToken) {
        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: { action: 'update-site-info', token: adminToken, entries },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to save');
      } else {
        for (const entry of entries) {
          const { error } = await supabase.from('site_info').upsert({
            section: entry.section,
            key: entry.key,
            value: entry.value,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'section,key' });
          if (error) throw error;
        }
      }

      await refreshSiteInfo();
      toast({
        title: 'Payment Settings Saved',
        description: 'Your payment options, PaySky keys, and InstaPay details have been updated.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to Save Settings',
        description: error.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test PaySky configuration
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (!config.paysky_mid || !config.paysky_tid || !config.paysky_secret_key) {
        throw new Error('Please fill in PaySky Merchant ID, Terminal ID, and Secret Key first.');
      }
      setTestResult('success');
      toast({
        title: 'Credentials Validated',
        description: 'PaySky parameters are well formatted. You can place a test order on the storefront.',
      });
    } catch (error: any) {
      console.error('PaySky test error:', error);
      setTestResult('error');
      toast({
        title: 'Validation Failed',
        description: error.message || 'Please check your credentials',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Gateways & Methods
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure electronic card payments, InstaPay transfers, and Cash on Delivery for AzkaSmart.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm font-semibold shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* 1. InstaPay Settings */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B2CBF] to-[#9D4EDD] text-white shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                InstaPay (إنستاباي)
                <span className="text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                  Instant Transfer
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accept instant payments directly via InstaPay Egyptian National Payment System with zero transaction fees.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="instapay_enabled" className="text-xs font-medium cursor-pointer">
              {config.instapay_enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="instapay_enabled"
              checked={config.instapay_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, instapay_enabled: checked }))}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="instapay_address" className="text-xs font-semibold">
              InstaPay Address / IPA (عنوان الدفع)
            </Label>
            <Input
              id="instapay_address"
              value={config.instapay_address}
              onChange={(e) => setConfig(prev => ({ ...prev, instapay_address: e.target.value }))}
              placeholder="e.g. azkasmart@instapay"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Your registered InstaPay payment address (IPA) shown to customers.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instapay_phone" className="text-xs font-semibold">
              InstaPay Mobile Number (رقم الهاتف المسجل)
            </Label>
            <Input
              id="instapay_phone"
              value={config.instapay_phone}
              onChange={(e) => setConfig(prev => ({ ...prev, instapay_phone: e.target.value }))}
              placeholder="e.g. 01050627310"
              className="font-mono text-sm"
              dir="ltr"
            />
            <p className="text-[11px] text-muted-foreground">
              Customers who prefer transferring by phone number will use this number.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instapay_name" className="text-xs font-semibold">
              Account Holder Name (اسم صاحب الحساب)
            </Label>
            <Input
              id="instapay_name"
              value={config.instapay_name}
              onChange={(e) => setConfig(prev => ({ ...prev, instapay_name: e.target.value }))}
              placeholder="e.g. AzkaSmart or Mohamed..."
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Displayed so the sender can confirm the recipient's name before sending.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instapay_instructions_ar" className="text-xs font-semibold">
              Custom Arabic Instructions (تعليمات إضافية بالعربية)
            </Label>
            <Input
              id="instapay_instructions_ar"
              value={config.instapay_instructions_ar}
              onChange={(e) => setConfig(prev => ({ ...prev, instapay_instructions_ar: e.target.value }))}
              placeholder="مثال: يرجى كتابة رقم الطلب في خانة الملاحظات بتطبيق إنستاباي"
              className="text-sm"
            />
          </div>
        </div>

        {/* Verification Preview Banner */}
        <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-purple-950 dark:text-purple-200">
              InstaPay Checkout & Verification Workflow:
            </p>
            <p className="text-purple-900/80 dark:text-purple-300 leading-relaxed">
              Customers see your IPA, phone, and account name with one-click copy buttons. 
              During checkout, they can enter their transfer reference number, upload an optional screenshot of the transfer receipt, and directly click to send proof via WhatsApp. 
              You can verify the payment in Orders Management before changing the status to Processing or Shipped.
            </p>
          </div>
        </div>
      </div>

      {/* 2. PaySky Payment Gateway */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                PaySky Payment Gateway
                <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  Visa / Mastercard / Meeza
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accept credit, debit, and Meeza cards in Egyptian Pounds (EGP) with 3D Secure verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="paysky_enabled" className="text-xs font-medium cursor-pointer">
              {config.paysky_enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="paysky_enabled"
              checked={config.paysky_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, paysky_enabled: checked }))}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="merchantId" className="text-xs font-semibold">
              Merchant ID (MID)
            </Label>
            <Input
              id="merchantId"
              value={config.paysky_mid}
              onChange={(e) => setConfig(prev => ({ ...prev, paysky_mid: e.target.value }))}
              placeholder="e.g., 8386003528"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Your PaySky Merchant ID
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="terminalId" className="text-xs font-semibold">
              Terminal ID (TID)
            </Label>
            <Input
              id="terminalId"
              value={config.paysky_tid}
              onChange={(e) => setConfig(prev => ({ ...prev, paysky_tid: e.target.value }))}
              placeholder="e.g., 93655786"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Your PaySky Terminal ID
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="secretKey" className="text-xs font-semibold">
              Secret Key (HMAC Key)
            </Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecret ? 'text' : 'password'}
                value={config.paysky_secret_key}
                onChange={(e) => setConfig(prev => ({ ...prev, paysky_secret_key: e.target.value }))}
                placeholder="Enter your PaySky HMAC secret key"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Used to generate SHA-256 HMAC signature for 3D Secure hosted checkout sessions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button 
            type="button"
            onClick={handleTestConnection} 
            disabled={isTesting}
            variant={testResult === 'success' ? 'default' : 'outline'}
            size="sm"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Validate PaySky Keys
              </>
            )}
          </Button>

          {testResult && (
            <div className={`flex items-center gap-2 text-xs font-medium ${
              testResult === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Keys configured properly
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Missing or invalid keys
                </>
              )}
            </div>
          )}

          <a 
            href="https://paysky.io/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline ml-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            PaySky Documentation
          </a>
        </div>
      </div>

      {/* 3. Cash on Delivery (COD) */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Cash on Delivery (الدفع عند الاستلام)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow customers across Egypt to pay cash in hand when their parcel arrives.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="cod_enabled" className="text-xs font-medium cursor-pointer">
              {config.cod_enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="cod_enabled"
              checked={config.cod_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, cod_enabled: checked }))}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cod_fee" className="text-xs font-semibold">
              Additional COD Collection Fee (رسوم تحصيل إضافية بالجنيه)
            </Label>
            <Input
              id="cod_fee"
              type="number"
              min="0"
              value={config.cod_fee}
              onChange={(e) => setConfig(prev => ({ ...prev, cod_fee: e.target.value }))}
              placeholder="0"
              className="font-mono text-sm max-w-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Extra courier collection fee added to COD orders (leave 0 for free COD).
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 font-semibold shadow-md">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save All Payment Settings'}
        </Button>
      </div>
    </div>
  );
}
