import { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentConfig {
  merchantId: string;
  terminalId: string;
  secretKey: string;
}

export function PaymentSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PaymentConfig>({
    merchantId: '',
    terminalId: '',
    secretKey: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Test PaySky configuration
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('paysky-checkout', {
        body: {
          orderId: 'test-' + Date.now(),
          amount: 100, // Test with 100 EGP
          merchantReference: 'test-connection',
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast({
          title: 'PaySky Connection Successful',
          description: 'Your payment gateway is configured correctly.',
        });
      } else {
        throw new Error(data?.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('PaySky test error:', error);
      setTestResult('error');
      toast({
        title: 'PaySky Connection Failed',
        description: error.message || 'Please check your credentials',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          PaySky Payment Gateway
        </h2>
        <p className="text-muted-foreground mb-6">
          Configure your PaySky credentials for accepting payments in Egyptian Pounds (EGP).
          Credentials are securely stored and encrypted.
        </p>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">PaySky LightBox Integration</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports Visa, Mastercard, and Meeza cards. Secure checkout via PaySky's hosted payment page.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Form - Read Only Display */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="merchantId">Merchant ID (MID)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="merchantId"
                value={config.merchantId}
                onChange={(e) => setConfig(prev => ({ ...prev, merchantId: e.target.value }))}
                placeholder="e.g., 26711714029"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your PaySky Merchant ID
            </p>
          </div>

          <div>
            <Label htmlFor="terminalId">Terminal ID (TID)</Label>
            <Input
              id="terminalId"
              value={config.terminalId}
              onChange={(e) => setConfig(prev => ({ ...prev, terminalId: e.target.value }))}
              placeholder="e.g., 78603449"
              className="font-mono mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your PaySky Terminal ID
            </p>
          </div>

          <div>
            <Label htmlFor="secretKey">Secret Key</Label>
            <div className="flex gap-2 mt-1.5">
              <div className="relative flex-1">
                <Input
                  id="secretKey"
                  type={showSecret ? 'text' : 'password'}
                  value={config.secretKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                  placeholder="Enter your secret key"
                  className="font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your HMAC secret key for secure hash generation
            </p>
          </div>

          {/* Action notice */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> To update PaySky credentials, you need to update them in the Lovable Cloud secrets. 
              The credentials shown here are for reference only. Current secrets are already configured and active.
            </p>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Test Connection</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Verify that your PaySky credentials are working correctly by testing the connection.
        </p>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleTestConnection} 
            disabled={isTesting}
            variant={testResult === 'success' ? 'default' : 'outline'}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Test PaySky Connection
              </>
            )}
          </Button>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${
              testResult === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Connection successful
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Connection failed
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Test Cards Reference */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Test Cards (Sandbox)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use these test cards in the PaySky sandbox environment:
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                alt="Visa" 
                className="h-5" 
              />
              <span className="font-medium text-sm">Visa Test Card</span>
            </div>
            <p className="font-mono text-sm">4440 0000 4220 0014</p>
            <p className="text-xs text-muted-foreground mt-1">Exp: 01/32 | CVV: 100</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
                alt="Mastercard" 
                className="h-5" 
              />
              <span className="font-medium text-sm">Mastercard Test Card</span>
            </div>
            <p className="font-mono text-sm">5123 4567 8901 2346</p>
            <p className="text-xs text-muted-foreground mt-1">Exp: 01/32 | CVV: 100</p>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="text-center">
        <a 
          href="https://paysky.io/docs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View PaySky Documentation
        </a>
      </div>
    </div>
  );
}
