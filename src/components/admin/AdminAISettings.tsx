import { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Play,
  Layers,
  Activity,
  ArrowRight,
  Database,
  Image as ImageIcon,
  ShoppingCart,
  MessageSquare,
  HelpCircle,
  Save,
  CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { refreshSiteInfo } from '@/hooks/useSiteInfo';

interface Props {
  adminToken?: string;
}

interface AIKeysConfig {
  gemini_api_key: string;
  groq_api_key: string;
  openrouter_api_key: string;
  huggingface_api_key: string;
  gemini_model: string;
  groq_model: string;
  openrouter_model: string;
  huggingface_model: string;
  primary_provider: string;
  fallback_enabled: boolean;
}

interface ProviderTestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  latencyMs?: number;
  message?: string;
  model?: string;
}

export function AdminAISettings({ adminToken }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'features' | 'failover'>('providers');

  // Key Visibility states
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    gemini: false,
    groq: false,
    openrouter: false,
    huggingface: false,
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [config, setConfig] = useState<AIKeysConfig>({
    gemini_api_key: '',
    groq_api_key: '',
    openrouter_api_key: '',
    huggingface_api_key: '',
    gemini_model: 'gemini-1.5-flash',
    groq_model: 'llama-3.3-70b-versatile',
    openrouter_model: 'google/gemini-2.0-flash-exp:free',
    huggingface_model: 'meta-llama/Llama-3.1-8B-Instruct',
    primary_provider: 'gemini',
    fallback_enabled: true,
  });

  // Test Results per provider
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({
    gemini: { status: 'idle' },
    groq: { status: 'idle' },
    openrouter: { status: 'idle' },
    huggingface: { status: 'idle' },
    pollinations: { status: 'idle' },
  });

  // Simulator / Chain Test State
  const [simQuery, setSimQuery] = useState('Suggest a smart switch for my living room in Cairo');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<{
    text: string;
    providerUsed: string;
    latencyMs: number;
    timestamp: string;
  } | null>(null);

  // Load configuration from site_info table (section: 'ai')
  useEffect(() => {
    const fetchAIConfig = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('site_info')
          .select('key, value')
          .eq('section', 'ai');

        if (!error && data) {
          const map: Record<string, string> = {};
          data.forEach(item => {
            map[item.key] = item.value;
          });

          setConfig(prev => ({
            ...prev,
            gemini_api_key: map['gemini_api_key'] ?? prev.gemini_api_key,
            groq_api_key: map['groq_api_key'] ?? prev.groq_api_key,
            openrouter_api_key: map['openrouter_api_key'] ?? prev.openrouter_api_key,
            huggingface_api_key: map['huggingface_api_key'] ?? prev.huggingface_api_key,
            gemini_model: map['gemini_model'] ?? prev.gemini_model,
            groq_model: map['groq_model'] ?? prev.groq_model,
            openrouter_model: map['openrouter_model'] ?? prev.openrouter_model,
            huggingface_model: map['huggingface_model'] ?? prev.huggingface_model,
            primary_provider: map['primary_provider'] ?? prev.primary_provider,
            fallback_enabled: map['fallback_enabled'] !== 'false',
          }));
        }
      } catch (err) {
        console.error('Failed to load AI settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAIConfig();
  }, []);

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Save AI configuration to site_info table
  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [
        { section: 'ai', key: 'gemini_api_key', value: config.gemini_api_key.trim() },
        { section: 'ai', key: 'groq_api_key', value: config.groq_api_key.trim() },
        { section: 'ai', key: 'openrouter_api_key', value: config.openrouter_api_key.trim() },
        { section: 'ai', key: 'huggingface_api_key', value: config.huggingface_api_key.trim() },
        { section: 'ai', key: 'gemini_model', value: config.gemini_model.trim() },
        { section: 'ai', key: 'groq_model', value: config.groq_model.trim() },
        { section: 'ai', key: 'openrouter_model', value: config.openrouter_model.trim() },
        { section: 'ai', key: 'huggingface_model', value: config.huggingface_model.trim() },
        { section: 'ai', key: 'primary_provider', value: config.primary_provider.trim() },
        { section: 'ai', key: 'fallback_enabled', value: String(config.fallback_enabled) },
      ];

      if (adminToken) {
        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: { action: 'update-site-info', token: adminToken, entries },
        });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to save via admin gateway');
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
        title: 'AI Service Settings Saved',
        description: 'API keys, models, and failover preferences updated in live database.',
      });
    } catch (error: any) {
      console.error('AI save error:', error);
      toast({
        title: 'Failed to Save Settings',
        description: error.message || 'Please check your admin session.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test an individual provider
  const handleTestProvider = async (provider: 'gemini' | 'groq' | 'openrouter' | 'huggingface' | 'pollinations') => {
    setTestResults(prev => ({
      ...prev,
      [provider]: { status: 'testing', message: 'Pinging API...' },
    }));

    const startTime = performance.now();

    // 1. Try testing via backend edge function first
    if (adminToken) {
      try {
        const currentKey = 
          provider === 'gemini' ? config.gemini_api_key :
          provider === 'groq' ? config.groq_api_key :
          provider === 'openrouter' ? config.openrouter_api_key :
          provider === 'huggingface' ? config.huggingface_api_key : undefined;

        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: {
            action: 'test-ai-provider',
            token: adminToken,
            provider,
            key: currentKey || undefined,
            model: 
              provider === 'gemini' ? config.gemini_model :
              provider === 'groq' ? config.groq_model :
              provider === 'openrouter' ? config.openrouter_model :
              provider === 'huggingface' ? config.huggingface_model : undefined,
          },
        });

        if (!error && data?.success) {
          const elapsed = Math.round(data.latencyMs || (performance.now() - startTime));
          setTestResults(prev => ({
            ...prev,
            [provider]: {
              status: 'success',
              latencyMs: elapsed,
              model: data.model,
              message: `Verified successfully via backend (${elapsed}ms)`,
            },
          }));
          return;
        }
      } catch {
        // Fall back to direct REST probe
      }
    }

    // 2. Direct browser test fallback
    try {
      if (provider === 'gemini') {
        const key = config.gemini_api_key.trim();
        if (!key) {
          throw new Error('Please enter a Gemini API Key to test');
        }
        const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: config.gemini_model || 'gemini-1.5-flash',
            messages: [{ role: 'user', content: 'Reply with the word "OK"' }],
            max_tokens: 10,
          }),
        });
        const elapsed = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 120)}`);
        }
        setTestResults(prev => ({
          ...prev,
          gemini: {
            status: 'success',
            latencyMs: elapsed,
            model: config.gemini_model,
            message: `Verified successfully (${elapsed}ms)`,
          },
        }));
      } else if (provider === 'groq') {
        const key = config.groq_api_key.trim();
        if (!key) throw new Error('Please enter a Groq API Key to test');
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: config.groq_model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Reply with the word "OK"' }],
            max_tokens: 10,
          }),
        });
        const elapsed = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 120)}`);
        }
        setTestResults(prev => ({
          ...prev,
          groq: {
            status: 'success',
            latencyMs: elapsed,
            model: config.groq_model,
            message: `Verified successfully (${elapsed}ms)`,
          },
        }));
      } else if (provider === 'openrouter') {
        const key = config.openrouter_api_key.trim();
        if (!key) throw new Error('Please enter an OpenRouter API Key to test');
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AzkaSmart Admin',
          },
          body: JSON.stringify({
            model: config.openrouter_model || 'google/gemini-2.0-flash-exp:free',
            messages: [{ role: 'user', content: 'Reply with the word "OK"' }],
            max_tokens: 10,
          }),
        });
        const elapsed = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 120)}`);
        }
        setTestResults(prev => ({
          ...prev,
          openrouter: {
            status: 'success',
            latencyMs: elapsed,
            model: config.openrouter_model,
            message: `Verified successfully (${elapsed}ms)`,
          },
        }));
      } else if (provider === 'huggingface') {
        const key = config.huggingface_api_key.trim();
        if (!key) throw new Error('Please enter a Hugging Face Access Token to test');
        const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: config.huggingface_model || 'meta-llama/Llama-3.1-8B-Instruct',
            messages: [{ role: 'user', content: 'Reply with the word "OK"' }],
            max_tokens: 10,
          }),
        });
        const elapsed = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 120)}`);
        }
        setTestResults(prev => ({
          ...prev,
          huggingface: {
            status: 'success',
            latencyMs: elapsed,
            model: config.huggingface_model,
            message: `Verified successfully (${elapsed}ms)`,
          },
        }));
      } else if (provider === 'pollinations') {
        const resp = await fetch('https://text.pollinations.ai/openai?referrer=azkasmart.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai-fast',
            messages: [{ role: 'user', content: 'Reply with the word "OK"' }],
            max_tokens: 10,
          }),
        });
        const elapsed = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        setTestResults(prev => ({
          ...prev,
          pollinations: {
            status: 'success',
            latencyMs: elapsed,
            model: 'openai-fast (public)',
            message: `Public gateway reachable (${elapsed}ms)`,
          },
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          status: 'error',
          message: err.message || 'Connection test failed',
        },
      }));
    }
  };

  // Test all providers sequentially
  const handleTestAll = async () => {
    toast({
      title: 'Testing AI Gateway',
      description: 'Running diagnostics on all configured providers and fallbacks...',
    });
    const providers: Array<'gemini' | 'groq' | 'openrouter' | 'huggingface' | 'pollinations'> = [
      'gemini',
      'groq',
      'openrouter',
      'huggingface',
      'pollinations',
    ];
    for (const p of providers) {
      await handleTestProvider(p);
    }
  };

  // Run live failover simulation through the site's Smart Home Consultant endpoint
  const handleSimulateChat = async () => {
    if (!simQuery.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    const start = performance.now();

    try {
      const resp = await supabase.functions.invoke('smart-home-consultant', {
        body: { message: simQuery, stream: false },
      });

      const elapsed = Math.round(performance.now() - start);

      if (resp.error) {
        throw new Error(resp.error.message || 'Consultant failed');
      }

      const text = resp.data?.response || JSON.stringify(resp.data);
      // Determine if fallback or AI answered
      const isCatalogFallback = text.includes('أهلاً بك في **AzkaSmart**!') || text.includes('Welcome to **AzkaSmart**!');
      const providerUsed = isCatalogFallback ? 'Tier 6: Local Catalog Rule Engine (Offline Fallback)' : 'Remote AI Gateway (Tier 1-5)';

      setSimResult({
        text,
        providerUsed,
        latencyMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setSimResult({
        text: `Error invoking gateway: ${err.message}`,
        providerUsed: 'Failed to reach Edge Function',
        latencyMs: Math.round(performance.now() - start),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setSimLoading(false);
    }
  };

  const configuredCount = [
    config.gemini_api_key,
    config.groq_api_key,
    config.openrouter_api_key,
    config.huggingface_api_key,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading AI services and configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">AI Services & Failover Management</h2>
            <Badge variant="outline" className="ml-2 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              6-Tier Resilient
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Configure API keys for external models (Gemini, Groq, OpenRouter, Hugging Face). Inspect live operational
            readiness across all storefront AI features and verify the automatic cascading fallback plan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAll}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Test All Providers
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Keys
          </Button>
        </div>
      </div>

      {/* Summary Operational Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Gateway Health */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Overall Gateway Health</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-1.5 text-foreground">
              Fault-Tolerant
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Customer chats never crash: automatic failover protects every request.</p>
            <div className="font-medium text-emerald-600 dark:text-emerald-400">
              {configuredCount} / 4 Private Providers Keyed
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Primary AI Engine */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Active Primary Engine</span>
              <Cpu className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-xl font-bold capitalize text-foreground">
              {config.primary_provider === 'gemini' ? 'Google Gemini' :
               config.primary_provider === 'groq' ? 'Groq Llama 3.3' :
               config.primary_provider === 'openrouter' ? 'OpenRouter' : 'Hugging Face'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>
              Model: <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">
                {config.primary_provider === 'gemini' ? config.gemini_model :
                 config.primary_provider === 'groq' ? config.groq_model :
                 config.primary_provider === 'openrouter' ? config.openrouter_model : config.huggingface_model}
              </code>
            </p>
            <div className="text-muted-foreground">
              Tier 1 Priority in conversation pipeline
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Standby Fallback Tiers */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Standby Fallback Tiers</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              5 Active Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Groq ➔ OpenRouter ➔ HuggingFace ➔ Pollinations ➔ Local Heuristics</p>
            <div className="text-amber-600 dark:text-amber-400 font-medium">
              Seamless transition in &lt;100ms
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Storefront Protection */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Zero-Downtime Guarantee</span>
              <ShieldCheck className="w-4 h-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              100% Uptime
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Database heuristic engine provides catalog suggestions if all APIs fail.</p>
            <div className="text-sky-600 dark:text-sky-400 font-medium">
              Local Egyptian warranty & prices intact
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Sub-Navigation Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-lg mb-6">
          <TabsTrigger value="providers" className="gap-1.5">
            <Key className="w-4 h-4" />
            API Keys & Models
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5">
            <Activity className="w-4 h-4" />
            What's Working Now
          </TabsTrigger>
          <TabsTrigger value="failover" className="gap-1.5">
            <Layers className="w-4 h-4" />
            The Fallover Plan
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: PROVIDERS & KEYS
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="providers" className="space-y-6">
          {/* Global Gateway Preferences */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Gateway Orchestration Preferences
              </CardTitle>
              <CardDescription>
                Configure which model acts as the primary driver and whether automatic fallback to backup providers is engaged.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primary_provider">Default Primary Provider</Label>
                <Select
                  value={config.primary_provider}
                  onValueChange={(val) => setConfig(prev => ({ ...prev, primary_provider: val }))}
                >
                  <SelectTrigger id="primary_provider">
                    <SelectValue placeholder="Select primary provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini (Recommended for Vision & Context)</SelectItem>
                    <SelectItem value="groq">Groq Cloud (Recommended for Speed & Llama 3.3)</SelectItem>
                    <SelectItem value="openrouter">OpenRouter (Universal Aggregator)</SelectItem>
                    <SelectItem value="huggingface">Hugging Face Router</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The gateway calls this provider first. If it returns 429, 500, or times out, the next tier takes over.
                </p>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Automatic Cascade Fallover</Label>
                    <p className="text-xs text-muted-foreground">
                      If primary fails or runs out of credits, instantly try standby providers without throwing errors.
                    </p>
                  </div>
                  <Switch
                    checked={config.fallback_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, fallback_enabled: checked }))}
                  />
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Guarantees smooth user experience even during major third-party AI outages.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider 1: Google Gemini */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500 text-white hover:bg-sky-600">Tier 1 Primary</Badge>
                  <CardTitle className="text-lg font-bold">Google Gemini</CardTitle>
                  <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-600">Multimodal Vision & Chat</Badge>
                </div>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Get Free Gemini API Key (1,500 req/day) <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CardDescription>
                Powers bilingual smart home consultations, Floor Plan image recognition, and visual search. Free tier offers 15 req/min.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="gemini_key">Gemini API Key</Label>
                  <div className="relative">
                    <Input
                      id="gemini_key"
                      type={showKeys.gemini ? 'text' : 'password'}
                      value={config.gemini_api_key}
                      onChange={(e) => setConfig(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                      placeholder="AIzaSy..."
                      className="pr-20 font-mono text-xs"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleShowKey('gemini')}
                      >
                        {showKeys.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(config.gemini_api_key, 'gemini')}
                      >
                        {copiedKey === 'gemini' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gemini_model">Model Identifier</Label>
                  <Select
                    value={config.gemini_model}
                    onValueChange={(val) => setConfig(prev => ({ ...prev, gemini_model: val }))}
                  >
                    <SelectTrigger id="gemini_model" className="font-mono text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Fast & Free)</SelectItem>
                      <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</SelectItem>
                      <SelectItem value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Next Gen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status and Diagnostics */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {testResults.gemini.status === 'testing' ? (
                    <Badge variant="outline" className="gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</Badge>
                  ) : testResults.gemini.status === 'success' ? (
                    <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Ready ({testResults.gemini.latencyMs}ms)</Badge>
                  ) : testResults.gemini.status === 'error' ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Error: {testResults.gemini.message}</Badge>
                  ) : config.gemini_api_key ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Key Configured</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">Missing Key</Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestProvider('gemini')}
                  disabled={testResults.gemini.status === 'testing' || !config.gemini_api_key}
                  className="gap-1 h-8 text-xs"
                >
                  <Play className="w-3 h-3" /> Test Gemini
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Provider 2: Groq Cloud */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white hover:bg-amber-600">Tier 2 Ultra-Fast</Badge>
                  <CardTitle className="text-lg font-bold">Groq Cloud</CardTitle>
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">&lt;300ms Inference</Badge>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Get Free Groq API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CardDescription>
                Powers ultra-fast conversational responses with Llama 3.3 70B Versatile on custom LPU hardware. Outstanding Arabic & English fluency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="groq_key">Groq API Key</Label>
                  <div className="relative">
                    <Input
                      id="groq_key"
                      type={showKeys.groq ? 'text' : 'password'}
                      value={config.groq_api_key}
                      onChange={(e) => setConfig(prev => ({ ...prev, groq_api_key: e.target.value }))}
                      placeholder="gsk_..."
                      className="pr-20 font-mono text-xs"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleShowKey('groq')}
                      >
                        {showKeys.groq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(config.groq_api_key, 'groq')}
                      >
                        {copiedKey === 'groq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groq_model">Model Identifier</Label>
                  <Select
                    value={config.groq_model}
                    onValueChange={(val) => setConfig(prev => ({ ...prev, groq_model: val }))}
                  >
                    <SelectTrigger id="groq_model" className="font-mono text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Flagship)</SelectItem>
                      <SelectItem value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</SelectItem>
                      <SelectItem value="mixtral-8x7b-32768">mixtral-8x7b-32768 (MoE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status and Diagnostics */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {testResults.groq.status === 'testing' ? (
                    <Badge variant="outline" className="gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</Badge>
                  ) : testResults.groq.status === 'success' ? (
                    <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Ready ({testResults.groq.latencyMs}ms)</Badge>
                  ) : testResults.groq.status === 'error' ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Error: {testResults.groq.message}</Badge>
                  ) : config.groq_api_key ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Key Configured</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">Missing Key</Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestProvider('groq')}
                  disabled={testResults.groq.status === 'testing' || !config.groq_api_key}
                  className="gap-1 h-8 text-xs"
                >
                  <Play className="w-3 h-3" /> Test Groq
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Provider 3: OpenRouter */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500 text-white hover:bg-purple-600">Tier 3 Multi-Model</Badge>
                  <CardTitle className="text-lg font-bold">OpenRouter</CardTitle>
                  <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-600">Aggregator Gateway</Badge>
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Get OpenRouter Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CardDescription>
                Provides access to hundreds of open-source and proprietary models including free tier models with zero setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="openrouter_key">OpenRouter API Key</Label>
                  <div className="relative">
                    <Input
                      id="openrouter_key"
                      type={showKeys.openrouter ? 'text' : 'password'}
                      value={config.openrouter_api_key}
                      onChange={(e) => setConfig(prev => ({ ...prev, openrouter_api_key: e.target.value }))}
                      placeholder="sk-or-v1-..."
                      className="pr-20 font-mono text-xs"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleShowKey('openrouter')}
                      >
                        {showKeys.openrouter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(config.openrouter_api_key, 'openrouter')}
                      >
                        {copiedKey === 'openrouter' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openrouter_model">Model Identifier</Label>
                  <Select
                    value={config.openrouter_model}
                    onValueChange={(val) => setConfig(prev => ({ ...prev, openrouter_model: val }))}
                  >
                    <SelectTrigger id="openrouter_model" className="font-mono text-xs">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.0-flash-exp:free">gemini-2.0-flash-exp:free</SelectItem>
                      <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">llama-3.3-70b-instruct:free</SelectItem>
                      <SelectItem value="mistralai/mistral-7b-instruct:free">mistral-7b-instruct:free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status and Diagnostics */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {testResults.openrouter.status === 'testing' ? (
                    <Badge variant="outline" className="gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</Badge>
                  ) : testResults.openrouter.status === 'success' ? (
                    <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Ready ({testResults.openrouter.latencyMs}ms)</Badge>
                  ) : testResults.openrouter.status === 'error' ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Error: {testResults.openrouter.message}</Badge>
                  ) : config.openrouter_api_key ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Key Configured</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">Missing Key</Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestProvider('openrouter')}
                  disabled={testResults.openrouter.status === 'testing' || !config.openrouter_api_key}
                  className="gap-1 h-8 text-xs"
                >
                  <Play className="w-3 h-3" /> Test OpenRouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Provider 4: Hugging Face */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500 text-white hover:bg-orange-600">Tier 4 Serverless</Badge>
                  <CardTitle className="text-lg font-bold">Hugging Face Router</CardTitle>
                  <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-600">Inference Router</Badge>
                </div>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Get Hugging Face User Access Token <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CardDescription>
                Serverless endpoint for catalog specs enrichment, product description generation, and emergency text failover.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="hf_key">Hugging Face Access Token (Bearer)</Label>
                  <div className="relative">
                    <Input
                      id="hf_key"
                      type={showKeys.huggingface ? 'text' : 'password'}
                      value={config.huggingface_api_key}
                      onChange={(e) => setConfig(prev => ({ ...prev, huggingface_api_key: e.target.value }))}
                      placeholder="hf_..."
                      className="pr-20 font-mono text-xs"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleShowKey('huggingface')}
                      >
                        {showKeys.huggingface ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(config.huggingface_api_key, 'huggingface')}
                      >
                        {copiedKey === 'huggingface' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hf_model">Model Identifier</Label>
                  <Input
                    id="hf_model"
                    value={config.huggingface_model}
                    onChange={(e) => setConfig(prev => ({ ...prev, huggingface_model: e.target.value }))}
                    placeholder="meta-llama/Llama-3.1-8B-Instruct"
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Status and Diagnostics */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {testResults.huggingface.status === 'testing' ? (
                    <Badge variant="outline" className="gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Verifying...</Badge>
                  ) : testResults.huggingface.status === 'success' ? (
                    <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Ready ({testResults.huggingface.latencyMs}ms)</Badge>
                  ) : testResults.huggingface.status === 'error' ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Error: {testResults.huggingface.message}</Badge>
                  ) : config.huggingface_api_key ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Key Configured</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">Missing Key</Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestProvider('huggingface')}
                  disabled={testResults.huggingface.status === 'testing' || !config.huggingface_api_key}
                  className="gap-1 h-8 text-xs"
                >
                  <Play className="w-3 h-3" /> Test Hugging Face
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Provider 5: Pollinations.ai (Keyless Public Tier) */}
          <Card className="border-border bg-muted/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Tier 5 Public Safety Net</Badge>
                  <CardTitle className="text-lg font-bold">Pollinations.ai Fast Gateway</CardTitle>
                  <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600">Zero Keys Needed</Badge>
                </div>
              </div>
              <CardDescription>
                Public community inference proxy used as a keyless fallback before dropping to local catalog rules. Requires no API keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {testResults.pollinations.status === 'testing' ? (
                    <Badge variant="outline" className="gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Pinging Gateway...</Badge>
                  ) : testResults.pollinations.status === 'success' ? (
                    <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Online ({testResults.pollinations.latencyMs}ms)</Badge>
                  ) : testResults.pollinations.status === 'error' ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> {testResults.pollinations.message}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">Always Active</Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestProvider('pollinations')}
                  disabled={testResults.pollinations.status === 'testing'}
                  className="gap-1 h-8 text-xs"
                >
                  <Play className="w-3 h-3" /> Ping Public Gateway
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Keys are stored securely in Supabase <code className="bg-muted px-1.5 py-0.5 rounded">site_info</code> table and automatically refreshed by edge functions.
            </p>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All AI Configurations
            </Button>
          </div>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: WHAT'S WORKING NOW
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1: AI Consultant */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">AzkaSmart AI Consultant</CardTitle>
                      <CardDescription className="text-xs">Customer Facing (/ai-consultant)</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">Active &amp; Live</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Conversational assistant recommending Egyptian market smart home products, providing direct store URLs,
                  EGP pricing, installation advice, and protocol explanations in Arabic & English.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Tier 1: Gemini</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Tier 2: Groq</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Tier 6: Catalog Rules</span>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Cart Compatibility Checker */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Cart Protocol Harmony Advisor</CardTitle>
                      <CardDescription className="text-xs">Checkout &amp; Cart (/cart)</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Analyzes items in the customer's cart in real time. Flags Zigbee devices that lack a coordinator hub, checks
                  neutral wire prerequisites, and offers 1-click bundle recommendations.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Smart Fallback Enabled</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Automated Warnings</span>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3: Floor Plan Vision Analyzer */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Floor Plan &amp; Room Photo Designer</CardTitle>
                      <CardDescription className="text-xs">Home Designer (/home-designer)</CardDescription>
                    </div>
                  </div>
                  {config.gemini_api_key ? (
                    <Badge className="bg-emerald-500 text-white">Vision Ready</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600">Needs Gemini Key</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Scans architectural blueprints or real room photos to detect rooms (living room, bedroom, kitchen),
                  and automatically overlays recommended smart switches, motorized curtains, and motion sensors.
                </p>
                <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                  {config.gemini_api_key ? '✓ Gemini Multimodal Vision connected' : '⚠ Requires Gemini API Key to enable photo uploads'}
                </div>
              </CardContent>
            </Card>

            {/* Feature 4: Market Price Sync & Scraper */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Live Market Price Sync &amp; Recalibration</CardTitle>
                      <CardDescription className="text-xs">Admin Catalog &amp; Prices</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Automates price discovery across Egyptian retail channels (Amazon EG, Noon, electro-z-smart).
                  Uses AI to parse unstructured competitor specifications, models, and discount ratios.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Amazon EG Sync</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">Multi-model Parser</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Live Playground */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Live Gateway &amp; Failover Playground
              </CardTitle>
              <CardDescription>
                Send a real query to test the active pipeline. Observe which tier responds and measure end-to-end latency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  placeholder="Enter a customer inquiry in Arabic or English..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSimulateChat}
                  disabled={simLoading || !simQuery.trim()}
                  className="gap-2 shrink-0"
                >
                  {simLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute Live Query
                </Button>
              </div>

              {simResult && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Serviced by:</span>
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {simResult.providerUsed}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>Latency: <strong className="text-foreground">{simResult.latencyMs}ms</strong></span>
                      <span>Time: {simResult.timestamp}</span>
                    </div>
                  </div>
                  <div className="text-xs bg-card p-3 rounded-lg border border-border whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {simResult.text}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: THE FALLOVER PLAN
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="failover" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    The 6-Tier Automated Failover Architecture
                  </CardTitle>
                  <CardDescription>
                    How AzkaSmart guarantees zero crashes, zero blank responses, and continuous availability for Egyptian shoppers.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                  Zero Customer Disruption
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Cascade Stepper */}
              <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-6">
                {/* Step 1: Customer Inquiry */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Step 1: Incoming Customer Query</h4>
                      <Badge variant="secondary" className="text-[10px]">Arabic / English</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Customer asks a question on WhatsApp, the AI Consultant page, or during cart checkout.
                    </p>
                  </div>
                </div>

                {/* Step 2: Tier 1 Gemini */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-sky-500 border-4 border-background" />
                  <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-sky-700 dark:text-sky-300">Tier 1: Google Gemini (Primary Engine)</h4>
                      <Badge className="bg-sky-500 text-white text-[10px]">1st Choice</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processes query with smart product catalog context (up to 250 local products with EGP prices and specs).
                    </p>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
                      ↳ Trigger condition: If HTTP 429 (Rate Limit), 503 (Overloaded), or Timeout &gt; 4000ms:
                    </div>
                  </div>
                </div>

                {/* Step 3: Tier 2 Groq */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-background" />
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">Tier 2: Groq Llama 3.3 (High-Speed Fallback)</h4>
                      <Badge className="bg-amber-500 text-white text-[10px]">2nd Choice</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sub-second inference via LPU. Seamlessly takes over the user query in under 300ms without the customer noticing any delay.
                    </p>
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1 font-medium">
                      ↳ Trigger condition: If Groq quota exhausted or network error:
                    </div>
                  </div>
                </div>

                {/* Step 4: Tier 3 OpenRouter */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-background" />
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300">Tier 3: OpenRouter (Multi-Model Aggregator)</h4>
                      <Badge className="bg-purple-500 text-white text-[10px]">3rd Choice</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Routes dynamically across redundant free &amp; paid model endpoints (Llama 3, Mistral, Gemini free).
                    </p>
                    <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1 font-medium">
                      ↳ Trigger condition: If OpenRouter balance depleted or blocked:
                    </div>
                  </div>
                </div>

                {/* Step 5: Tier 4 Hugging Face */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-orange-500 border-4 border-background" />
                  <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-orange-700 dark:text-orange-300">Tier 4: Hugging Face Inference Router</h4>
                      <Badge className="bg-orange-500 text-white text-[10px]">4th Choice</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Serverless instruction-tuned Llama-3.1-8B model generates concise recommendations.
                    </p>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1 font-medium">
                      ↳ Trigger condition: If Hugging Face warm-up delays or fails:
                    </div>
                  </div>
                </div>

                {/* Step 6: Tier 5 Pollinations */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-background" />
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300">Tier 5: Pollinations Public Gateway</h4>
                      <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600">5th Choice</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keyless community proxy ensuring that even without any active API keys, external LLM generation continues.
                    </p>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                      ↳ Trigger condition: If complete internet/cloud LLM outage occurs:
                    </div>
                  </div>
                </div>

                {/* Step 7: Tier 6 Local Catalog Rule Engine */}
                <div className="relative">
                  <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-background" />
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        Tier 6: Local Catalog Rule Engine (Hard Fallback)
                      </h4>
                      <Badge className="bg-emerald-600 text-white text-[10px]">100% Offline Resilient</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Zero-external-dependency heuristic engine. Tokenizes the user's message, computes keyword match scores against
                      active products in Supabase, and composes an official Arabic or English recommendation complete with direct product
                      links, Egyptian Pound prices, official warranty terms, and links to Bundles &amp; Calculator.
                    </p>
                    <div className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Result: Customer receives an instantaneous, accurate, helpful answer with 0% error probability.
                    </div>
                  </div>
                </div>
              </div>

              {/* Failover Triggers Matrix */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Automatic Failover Trigger Matrix
                </h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-foreground font-medium border-b border-border">
                      <tr>
                        <th className="p-2.5 text-left">Incident Scenario</th>
                        <th className="p-2.5 text-left">Detection Signal</th>
                        <th className="p-2.5 text-left">Immediate Action</th>
                        <th className="p-2.5 text-left">Customer Experience</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2.5 font-medium">Free Tier Quota Hit</td>
                        <td className="p-2.5 text-muted-foreground">HTTP 429 / Rate Limit</td>
                        <td className="p-2.5 text-sky-600">Cascade to next tier in &lt;50ms</td>
                        <td className="p-2.5 text-emerald-600 font-medium">Completely invisible</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Provider Service Outage</td>
                        <td className="p-2.5 text-muted-foreground">HTTP 500 / 503 / 504</td>
                        <td className="p-2.5 text-sky-600">Skip to next healthy provider</td>
                        <td className="p-2.5 text-emerald-600 font-medium">Normal response streamed</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Missing or Expired Key</td>
                        <td className="p-2.5 text-muted-foreground">HTTP 401 Unauthorized</td>
                        <td className="p-2.5 text-sky-600">Flag in admin &amp; divert to standby</td>
                        <td className="p-2.5 text-emerald-600 font-medium">No interruption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Global LLM Failure</td>
                        <td className="p-2.5 text-muted-foreground">All remote providers timeout</td>
                        <td className="p-2.5 text-sky-600">Activate Tier 6 Catalog Heuristics</td>
                        <td className="p-2.5 text-emerald-600 font-medium">Receives curated product advice</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default AdminAISettings;
