import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

export default function Admin() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      // Fetch the CSV file
      const response = await fetch('/products-import.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV file');
      
      const csvContent = await response.text();
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('import-products', {
        body: { csvContent }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${data.inserted} products`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      setResult({ error: error.message });
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Admin - Product Import</title>
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-bold mb-8">Product Import</h1>
        
        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Import Products from CSV</h2>
            <p className="text-muted-foreground mb-6">
              This will import products from the uploaded CSV file with smart price conversion:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li>SONOFF products: Prices converted to EGP based on Egyptian market research (Amazon.eg, Noon.com)</li>
              <li>MOES, Lezn, Akubela: Prices kept as-is (already in EGP)</li>
              <li>Categories auto-assigned based on product names</li>
              <li>Duplicate/furniture products filtered out</li>
            </ul>
            
            <Button 
              onClick={handleImport} 
              disabled={isImporting}
              size="lg"
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importing Products...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className={`bg-card border rounded-xl p-6 ${result.error ? 'border-destructive' : 'border-primary'}`}>
              {result.error ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-destructive">Import Failed</h3>
                    <p className="text-muted-foreground">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-primary">Import Successful</h3>
                      <p className="text-muted-foreground">
                        Parsed: {result.total_parsed} products | Imported: {result.inserted} products
                      </p>
                    </div>
                  </div>
                  
                  {result.sample && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Sample Products:</h4>
                      <div className="bg-muted/50 rounded-lg p-4 text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.sample, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-destructive mb-2">Errors:</h4>
                      <ul className="text-sm text-muted-foreground">
                        {result.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
