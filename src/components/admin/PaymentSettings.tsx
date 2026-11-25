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
  Check,
  Lock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { refreshSiteInfo } from '@/hooks/useSiteInfo';

interface Props {
  adminToken?: string;
}

type XPayMode = 'test' | 'live';

interface GeneralPaymentConfig {
  instapay_address: string;
  instapay_phone: string;
  instapay_name: string;
  instapay_instructions_ar: string;
  instapay_instructions_en: string;
  instapay_enabled: boolean;
  cod_enabled: boolean;
  cod_fee: string;
}

interface XPayAdminState {
  enabled: boolean;
  mode: XPayMode;
  publishableKeyTest: string;
  publishableKeyLive: string;
  cardFeePercent: string;
  cardFeeFixed: string;
  hasSecretKeyTest: boolean;
  hasSecretKeyLive: boolean;
  hasWebhookSecretTest: boolean;
  hasWebhookSecretLive: boolean;
  secretKeyMaskTest: string;
  secretKeyMaskLive: string;
  webhookSecretMaskTest: string;
  webhookSecretMaskLive: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://djsibxhkfvwtjzvnjmhp.supabase.co';
const XPAY_WEBHOOK_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/xpay-webhook`;

export function PaymentSettings({ adminToken }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Write-only inputs for server-side secrets (never populated from server)
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [showWebhookInput, setShowWebhookInput] = useState(false);

  const [config, setConfig] = useState<GeneralPaymentConfig>({
    instapay_address: 'azkasmart@instapay',
    instapay_phone: '01050627310',
    instapay_name: 'AzkaSmart',
    instapay_instructions_ar: '',
    instapay_instructions_en: '',
    instapay_enabled: true,
    cod_enabled: true,
    cod_fee: '0',
  });

  const [xpay, setXpay] = useState<XPayAdminState>({
    enabled: false,
    mode: 'test',
    publishableKeyTest: '',
    publishableKeyLive: '',
    cardFeePercent: '0',
    cardFeeFixed: '0',
    hasSecretKeyTest: false,
    hasSecretKeyLive: false,
    hasWebhookSecretTest: false,
    hasWebhookSecretLive: false,
    secretKeyMaskTest: '',
    secretKeyMaskLive: '',
    webhookSecretMaskTest: '',
    webhookSecretMaskLive: '',
  });

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_info')
          .select('key, value')
          .eq('section', 'payment');

        if (!error && data) {
          const map: Record<string, string> = {};
          data.forEach((item) => {
            map[item.key] = item.value;
          });

          setConfig((prev) => ({
            ...prev,
            instapay_address: map['instapay_address'] ?? prev.instapay_address,
            instapay_phone: map['instapay_phone'] ?? prev.instapay_phone,
            instapay_name: map['instapay_name'] ?? prev.instapay_name,
            instapay_instructions_ar: map['instapay_instructions_ar'] ?? prev.instapay_instructions_ar,
            instapay_instructions_en: map['instapay_instructions_en'] ?? prev.instapay_instructions_en,
            instapay_enabled: map['instapay_enabled'] !== 'false',
            cod_enabled: map['cod_enabled'] !== 'false',
            cod_fee: map['cod_fee'] ?? prev.cod_fee,
          }));

          setXpay((prev) => ({
            ...prev,
            enabled: map['xpay_enabled'] === 'true',
            mode: map['xpay_mode'] === 'live' ? 'live' : 'test',
            publishableKeyTest: map['xpay_publishable_key_test'] ?? '',
            publishableKeyLive: map['xpay_publishable_key_live'] ?? '',
            cardFeePercent: map['xpay_card_fee_percent'] ?? '0',
            cardFeeFixed: map['xpay_card_fee_fixed'] ?? '0',
          }));
        }

        if (adminToken) {
          const { data: xpayRes } = await supabase.functions.invoke('admin-write', {
            headers: { Authorization: 'Bearer ' + adminToken },
            body: { action: 'get-xpay-settings', token: adminToken },
          });
          if (xpayRes?.success && xpayRes.settings) {
            setXpay((prev) => ({ ...prev, ...xpayRes.settings }));
          }
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentSettings();
  }, [adminToken]);

  const activePublishableKey = xpay.mode === 'live' ? xpay.publishableKeyLive : xpay.publishableKeyTest;
  const activeHasSecretKey = xpay.mode === 'live' ? xpay.hasSecretKeyLive : xpay.hasSecretKeyTest;
  const activeSecretKeyMask = xpay.mode === 'live' ? xpay.secretKeyMaskLive : xpay.secretKeyMaskTest;
  const activeHasWebhookSecret = xpay.mode === 'live' ? xpay.hasWebhookSecretLive : xpay.hasWebhookSecretTest;
  const activeWebhookMask = xpay.mode === 'live' ? xpay.webhookSecretMaskLive : xpay.webhookSecretMaskTest;

  const setActivePublishableKey = (val: string) => {
    setXpay((prev) =>
      prev.mode === 'live'
        ? { ...prev, publishableKeyLive: val }
        : { ...prev, publishableKeyTest: val }
    );
  };

  const handleModeChange = (newMode: XPayMode) => {
    setXpay((prev) => ({ ...prev, mode: newMode }));
    setSecretKeyInput('');
    setWebhookSecretInput('');
    setTestStatus(null);
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(XPAY_WEBHOOK_URL);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
      toast({ title: 'Webhook URL Copied', description: XPAY_WEBHOOK_URL });
    } catch {
      toast({ title: 'Webhook URL', description: XPAY_WEBHOOK_URL });
    }
  };

  const handleClearActiveSecret = async (target: 'secret' | 'webhook') => {
    if (!adminToken) return;
    setSaving(true);
    try {
      const clearFlags =
        target === 'secret'
          ? xpay.mode === 'live'
            ? { clearSecretKeyLive: true }
            : { clearSecretKeyTest: true }
          : xpay.mode === 'live'
          ? { clearWebhookSecretLive: true }
          : { clearWebhookSecretTest: true };

      const { data, error } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: 'Bearer ' + adminToken },
        body: {
          action: 'save-xpay-settings',
          token: adminToken,
          enabled: xpay.enabled,
          mode: xpay.mode,
          publishableKeyTest: xpay.publishableKeyTest.trim(),
          publishableKeyLive: xpay.publishableKeyLive.trim(),
          cardFeePercent: xpay.cardFeePercent,
          cardFeeFixed: xpay.cardFeeFixed,
          ...clearFlags,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to clear secret');
      }
      if (data.settings) setXpay((prev) => ({ ...prev, ...data.settings }));
      await refreshSiteInfo();
      toast({ title: 'Server Secret Cleared' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save InstaPay + COD settings (unchanged)
      const generalEntries = [
        { section: 'payment', key: 'instapay_address', value: config.instapay_address.trim() },
        { section: 'payment', key: 'instapay_phone', value: config.instapay_phone.trim() },
        { section: 'payment', key: 'instapay_name', value: config.instapay_name.trim() },
        { section: 'payment', key: 'instapay_instructions_ar', value: config.instapay_instructions_ar.trim() },
        { section: 'payment', key: 'instapay_instructions_en', value: config.instapay_instructions_en.trim() },
        { section: 'payment', key: 'instapay_enabled', value: String(config.instapay_enabled) },
        { section: 'payment', key: 'cod_enabled', value: String(config.cod_enabled) },
        { section: 'payment', key: 'cod_fee', value: config.cod_fee.trim() },
      ];

      if (!adminToken) {
        throw new Error('Admin session token missing. Please re-login to save payment settings.');
      }

      const { data: genRes, error: genErr } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: 'Bearer ' + adminToken },
        body: { action: 'update-site-info', token: adminToken, entries: generalEntries },
      });
      if (genErr || !genRes?.success) {
        throw new Error(genRes?.error || genErr?.message || 'Failed to save InstaPay / COD settings');
      }

      // 2. Save XPay settings (secret keys & webhook secrets go strictly server-side into payment_secrets)
      const secretPayload =
        xpay.mode === 'live'
          ? {
              ...(secretKeyInput.trim() ? { secretKeyLive: secretKeyInput.trim() } : {}),
              ...(webhookSecretInput.trim() ? { webhookSecretLive: webhookSecretInput.trim() } : {}),
            }
          : {
              ...(secretKeyInput.trim() ? { secretKeyTest: secretKeyInput.trim() } : {}),
              ...(webhookSecretInput.trim() ? { webhookSecretTest: webhookSecretInput.trim() } : {}),
            };

      const { data: xpayRes, error: xpayErr } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: 'Bearer ' + adminToken },
        body: {
          action: 'save-xpay-settings',
          token: adminToken,
          enabled: xpay.enabled,
          mode: xpay.mode,
          publishableKeyTest: xpay.publishableKeyTest.trim(),
          publishableKeyLive: xpay.publishableKeyLive.trim(),
          cardFeePercent: xpay.cardFeePercent.trim() || '0',
          cardFeeFixed: xpay.cardFeeFixed.trim() || '0',
          ...secretPayload,
        },
      });

      if (xpayErr || !xpayRes?.success) {
        throw new Error(xpayRes?.error || xpayErr?.message || 'Failed to save XPay settings');
      }

      if (xpayRes.settings) {
        setXpay((prev) => ({ ...prev, ...xpayRes.settings }));
      }
      // Clear write-only secret inputs from client state immediately after save
      setSecretKeyInput('');
      setWebhookSecretInput('');
      setTestStatus(null);

      await refreshSiteInfo();
      toast({
        title: 'Payment Settings Saved',
        description: 'InstaPay, Cash on Delivery, and XPay card gateway settings have been updated securely.',
      });
    } catch (error: any) {
      console.error('Save payment settings error:', error);
      toast({
        title: 'Failed to Save Settings',
        description: error.message || 'Please check your inputs and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!adminToken) return;
    if (secretKeyInput.trim()) {
      toast({
        title: 'Save Required First',
        description: 'Click "Save All Settings" first so your new Secret Key is stored on the server, then test.',
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: 'Bearer ' + adminToken },
        body: { action: 'test-xpay-connection', token: adminToken, mode: xpay.mode },
      });

      if (error || !data?.success) {
        const msg = data?.error || error?.message || 'Could not authenticate with XPay API';
        setTestStatus({ ok: false, message: msg });
        toast({ variant: 'destructive', title: 'XPay Connection Failed', description: msg });
      } else {
        const msg = `Connected to XPay (${data.mode.toUpperCase()}): ${data.merchantName}`;
        setTestStatus({ ok: true, message: msg });
        toast({ title: 'XPay Connection Verified', description: msg });
      }
    } catch (err: any) {
      const msg = err?.message || 'Connection test failed';
      setTestStatus({ ok: false, message: msg });
      toast({ variant: 'destructive', title: 'Test Error', description: msg });
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
            Configure InstaPay transfers, XPay card payments (Drop-in), and Cash on Delivery for AzkaSmart.
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
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, instapay_enabled: checked }))}
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
              onChange={(e) => setConfig((prev) => ({ ...prev, instapay_address: e.target.value }))}
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
              onChange={(e) => setConfig((prev) => ({ ...prev, instapay_phone: e.target.value }))}
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
              onChange={(e) => setConfig((prev) => ({ ...prev, instapay_name: e.target.value }))}
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
              onChange={(e) => setConfig((prev) => ({ ...prev, instapay_instructions_ar: e.target.value }))}
              placeholder="مثال: يرجى كتابة رقم الطلب في خانة الملاحظات بتطبيق إنستاباي"
              className="text-sm"
            />
          </div>
        </div>

        <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-purple-950 dark:text-purple-200">
              InstaPay Checkout & Verification Workflow:
            </p>
            <p className="text-purple-900/80 dark:text-purple-300 leading-relaxed">
              Customers see your IPA, payment link, QR code, and account name. During checkout, they can enter their
              transfer reference number, upload an optional receipt screenshot, and confirm proof via WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* 2. XPay Card Payments (Drop-in) */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex flex-wrap items-center gap-2">
                XPay Card Payments
                <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  Visa / Mastercard / Meeza
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    xpay.mode === 'live'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {xpay.mode === 'live' ? 'LIVE MODE' : 'TEST MODE'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Embedded XPay Drop-in checkout inside an encrypted XPay iframe with server-verified webhooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="xpay_enabled" className="text-xs font-medium cursor-pointer">
              {xpay.enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="xpay_enabled"
              checked={xpay.enabled}
              onCheckedChange={(checked) => setXpay((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/40 border border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Environment Mode</p>
            <p className="text-[11px] text-muted-foreground">
              Run full end-to-end tests in Test Mode first, then switch to Live Mode with live XPay keys.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-1 shrink-0">
            <button
              type="button"
              onClick={() => handleModeChange('test')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                xpay.mode === 'test'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Test (Sandbox)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('live')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                xpay.mode === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Live (Production)
            </button>
          </div>
        </div>

        {xpay.enabled && (!activePublishableKey || !activeHasSecretKey) && (
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Keys required for {xpay.mode.toUpperCase()} mode:</strong> Checkout will show InstaPay only
              until both a <code className="font-mono">{xpay.mode === 'live' ? 'pk_live_*' : 'pk_test_*'}</code>{' '}
              publishable key and a <code className="font-mono">{xpay.mode === 'live' ? 'sk_live_*' : 'sk_test_*'}</code>{' '}
              secret key are saved for {xpay.mode} mode.
            </div>
          </div>
        )}

        {/* API Keys for active mode */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="xpay_publishable_key" className="text-xs font-semibold">
              {xpay.mode === 'live' ? 'Live Publishable Key (pk_live_...)' : 'Test Publishable Key (pk_test_...)'}
            </Label>
            <Input
              id="xpay_publishable_key"
              value={activePublishableKey}
              onChange={(e) => setActivePublishableKey(e.target.value)}
              placeholder={xpay.mode === 'live' ? 'pk_live_...' : 'pk_test_...'}
              className="font-mono text-sm"
              dir="ltr"
            />
            <p className="text-[11px] text-muted-foreground">
              Public key used only to initialize the XPay Drop-in browser SDK. Safe for frontend use.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="xpay_secret_key" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                {xpay.mode === 'live' ? 'Live Secret Key (sk_live_...)' : 'Test Secret Key (sk_test_...)'}
              </Label>
              {activeHasSecretKey && (
                <button
                  type="button"
                  onClick={() => handleClearActiveSecret('secret')}
                  className="text-[11px] text-destructive hover:underline inline-flex items-center gap-1"
                  title="Clear stored secret key"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="xpay_secret_key"
                type={showSecretInput ? 'text' : 'password'}
                autoComplete="new-password"
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value)}
                placeholder={
                  activeHasSecretKey
                    ? 'Saved on server — leave blank to keep existing key'
                    : xpay.mode === 'live'
                    ? 'sk_live_...'
                    : 'sk_test_...'
                }
                className="font-mono text-sm pr-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowSecretInput(!showSecretInput)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showSecretInput ? 'Hide input' : 'Show input'}
              >
                {showSecretInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {activeHasSecretKey ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle className="w-3 h-3 shrink-0" />
                Configured server-side ({activeSecretKeyMask}) — never sent to browser
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Stored strictly server-side in locked secrets storage; write-only from this panel.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="xpay_webhook_secret" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Webhook Signing Secret (whsec_...)
              </Label>
              {activeHasWebhookSecret && (
                <button
                  type="button"
                  onClick={() => handleClearActiveSecret('webhook')}
                  className="text-[11px] text-destructive hover:underline inline-flex items-center gap-1"
                  title="Clear stored webhook signing secret"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="xpay_webhook_secret"
                type={showWebhookInput ? 'text' : 'password'}
                autoComplete="new-password"
                value={webhookSecretInput}
                onChange={(e) => setWebhookSecretInput(e.target.value)}
                placeholder={
                  activeHasWebhookSecret
                    ? 'Saved on server — leave blank to keep existing secret'
                    : 'whsec_...'
                }
                className="font-mono text-sm pr-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowWebhookInput(!showWebhookInput)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showWebhookInput ? 'Hide input' : 'Show input'}
              >
                {showWebhookInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {activeHasWebhookSecret ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle className="w-3 h-3 shrink-0" />
                Configured server-side ({activeWebhookMask}) — never sent to browser
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                From XPay Dashboard → Developers → Webhooks → Signing secret (<code className="font-mono">whsec_*</code>).
              </p>
            )}
          </div>
        </div>

        {/* Webhook URL & Events Guide */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-semibold">AzkaSmart XPay Webhook URL (paste into app.xpay.app)</Label>
            <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl} className="h-7 gap-1.5 text-xs">
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWebhook ? 'Copied' : 'Copy Webhook URL'}
            </Button>
          </div>
          <code className="block w-full p-2.5 rounded-lg bg-background border border-border font-mono text-xs break-all select-all" dir="ltr">
            {XPAY_WEBHOOK_URL}
          </code>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Subscribe this endpoint in XPay Dashboard → Developers → Webhooks ({xpay.mode} mode) to:{' '}
            <code className="font-mono">checkout.session.completed</code>,{' '}
            <code className="font-mono">checkout.session.async_payment_succeeded</code>,{' '}
            <code className="font-mono">checkout.session.async_payment_failed</code>,{' '}
            <code className="font-mono">checkout.session.expired</code>, and{' '}
            <code className="font-mono">charge.failed</code>.
          </p>
        </div>

        {/* Optional Card Fee (Default: 0 / none) */}
        <div className="grid md:grid-cols-2 gap-4 pt-1 border-t border-border">
          <div className="space-y-1.5">
            <Label htmlFor="xpay_card_fee_percent" className="text-xs font-semibold">
              Optional Card Fee % (Default: 0%)
            </Label>
            <Input
              id="xpay_card_fee_percent"
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={xpay.cardFeePercent}
              onChange={(e) => setXpay((prev) => ({ ...prev, cardFeePercent: e.target.value }))}
              className="font-mono text-sm max-w-xs"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xpay_card_fee_fixed" className="text-xs font-semibold">
              Optional Fixed Card Fee EGP (Default: 0 EGP)
            </Label>
            <Input
              id="xpay_card_fee_fixed"
              type="number"
              min="0"
              max="1000"
              step="1"
              value={xpay.cardFeeFixed}
              onChange={(e) => setXpay((prev) => ({ ...prev, cardFeeFixed: e.target.value }))}
              className="font-mono text-sm max-w-xs"
              dir="ltr"
            />
          </div>
          <p className="text-[11px] text-muted-foreground md:col-span-2">
            Leave both at <code className="font-mono">0</code> so customers pay the exact AzkaSmart order total with no
            extra surcharge.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !activeHasSecretKey}
            variant="outline"
            size="sm"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Test XPay Connection ({xpay.mode})
              </>
            )}
          </Button>

          {testStatus && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                testStatus.ok ? 'text-emerald-600' : 'text-destructive'
              }`}
            >
              {testStatus.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testStatus.message}</span>
            </div>
          )}

          <a
            href="https://docs.xpay.app/en/integrate/integration-patterns/drop-in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline ml-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            XPay Drop-in Documentation
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
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, cod_enabled: checked }))}
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
              onChange={(e) => setConfig((prev) => ({ ...prev, cod_fee: e.target.value }))}
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
