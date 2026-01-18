import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, CheckCircle, AlertCircle, Image, FileText, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function Admin() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhanceResults, setEnhanceResults] = useState<any[]>([]);
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

  const handleFindImages = async () => {
    setIsEnhancing(true);
    setEnhanceResults([]);
    setEnhanceProgress(0);

    try {
      // Process in batches
      const batchSize = 5;
      const totalBatches = 2; // Process 10 products total
      
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('enhance-products', {
          body: { action: 'find-missing-images', batchSize }
        });

        if (error) throw error;

        if (data?.results) {
          setEnhanceResults(prev => [...prev, ...data.results]);
        }
        
        setEnhanceProgress(((i + 1) / totalBatches) * 100);
        
        // If no more products to process, break
        if (!data?.results?.length || data.results.length < batchSize) break;
      }

      toast({
        title: 'Image Search Complete',
        description: 'Product images have been updated',
      });
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast({
        title: 'Image Search Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateDescriptions = async () => {
    setIsEnhancing(true);
    setEnhanceResults([]);
    setEnhanceProgress(0);

    try {
      // Process in batches
      const batchSize = 10;
      const totalBatches = 5; // Process 50 products total
      
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('enhance-products', {
          body: { action: 'generate-descriptions', batchSize }
        });

        if (error) throw error;

        if (data?.results) {
          setEnhanceResults(prev => [...prev, ...data.results]);
        }
        
        setEnhanceProgress(((i + 1) / totalBatches) * 100);
      }

      toast({
        title: 'Description Generation Complete',
        description: 'Product descriptions have been updated',
      });
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast({
        title: 'Description Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Admin - Product Management</title>
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-bold mb-8">Product Management</h1>
        
        <Tabs defaultValue="import" className="max-w-3xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="images">
              <Image className="w-4 h-4 mr-2" />
              Find Images
            </TabsTrigger>
            <TabsTrigger value="descriptions">
              <FileText className="w-4 h-4 mr-2" />
              AI Descriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Import Products from CSV</h2>
              <p className="text-muted-foreground mb-6">
                This will import products from the uploaded CSV file with smart price conversion:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                <li>SONOFF products: Prices converted to EGP based on Egyptian market research</li>
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
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Find Missing Product Images
              </h2>
              <p className="text-muted-foreground mb-6">
                Uses AI-powered web search to find official product images from manufacturers and retailers.
                This will update products that currently have no image.
              </p>
              
              <Button 
                onClick={handleFindImages} 
                disabled={isEnhancing}
                size="lg"
                className="w-full"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching for Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Find Missing Images
                  </>
                )}
              </Button>

              {isEnhancing && (
                <div className="mt-4">
                  <Progress value={enhanceProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing... {Math.round(enhanceProgress)}%
                  </p>
                </div>
              )}
            </div>

            {enhanceResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Results ({enhanceResults.length} products)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {enhanceResults.map((item, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg text-sm flex items-center justify-between ${
                        item.status === 'updated' ? 'bg-green-500/10 text-green-600' :
                        item.status === 'no_image_found' ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-red-500/10 text-red-600'
                      }`}
                    >
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="ml-2 capitalize">{item.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="descriptions" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Generate AI Descriptions
              </h2>
              <p className="text-muted-foreground mb-6">
                Uses AI to generate professional, compelling product descriptions optimized for the Egyptian smart home market.
              </p>
              
              <Button 
                onClick={handleGenerateDescriptions} 
                disabled={isEnhancing}
                size="lg"
                className="w-full"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Descriptions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate AI Descriptions
                  </>
                )}
              </Button>

              {isEnhancing && (
                <div className="mt-4">
                  <Progress value={enhanceProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing... {Math.round(enhanceProgress)}%
                  </p>
                </div>
              )}
            </div>

            {enhanceResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Results ({enhanceResults.length} products)</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {enhanceResults.map((item, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg text-sm ${
                        item.status === 'updated' ? 'bg-green-500/10' :
                        'bg-yellow-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className={`text-xs capitalize ${
                          item.status === 'updated' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
