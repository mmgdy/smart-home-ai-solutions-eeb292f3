import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, Loader2, Sparkles, X } from 'lucide-react';
import { useCalculator } from '@/hooks/useCalculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function FloorPlanUploader() {
  const { setFloorPlanUrl, setAiAnalysis, applyAiAnalysis, floorPlanUrl, aiAnalysis, setStep } = useCalculator();
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(floorPlanUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: isRTL ? 'نوع ملف غير صالح' : 'Invalid File Type',
        description: isRTL ? 'يرجى تحميل صورة' : 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: isRTL ? 'الملف كبير جداً' : 'File Too Large',
        description: isRTL ? 'الحد الأقصى 10 ميجابايت' : 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(fileName);

      setFloorPlanUrl(urlData.publicUrl);

      toast({
        title: isRTL ? 'تم التحميل بنجاح' : 'Upload Successful',
        description: isRTL ? 'جاري تحليل المخطط...' : 'Analyzing floor plan...',
      });

      // Auto-start AI analysis
      await analyzeFloorPlan(urlData.publicUrl);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: isRTL ? 'خطأ في التحميل' : 'Upload Error',
        description: isRTL ? 'فشل تحميل الملف' : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeFloorPlan = async (imageUrl: string) => {
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-floor-plan', {
        body: { imageUrl },
      });

      if (error) throw error;

      if (data.analysis) {
        setAiAnalysis(data.analysis);
        toast({
          title: isRTL ? 'اكتمل التحليل!' : 'Analysis Complete!',
          description: isRTL 
            ? `تم اكتشاف ${data.analysis.roomsDetected?.length || 0} غرف`
            : `Detected ${data.analysis.roomsDetected?.length || 0} rooms`,
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: isRTL ? 'خطأ في التحليل' : 'Analysis Error',
        description: isRTL ? 'فشل تحليل المخطط' : 'Failed to analyze floor plan',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setFloorPlanUrl(null);
    setAiAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-display text-xl font-bold mb-2">
          {isRTL ? 'تحميل مخطط الطابق (اختياري)' : 'Upload Floor Plan (Optional)'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isRTL 
            ? 'احصل على تحليل ذكي وتوصيات تلقائية بناءً على مخططك'
            : 'Get AI-powered analysis and automatic recommendations based on your floor plan'
          }
        </p>
      </div>

      {!previewUrl ? (
        <motion.label
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors",
            "border-border hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          )}
          
          <p className="font-medium mb-1">
            {isUploading 
              ? (isRTL ? 'جاري التحميل...' : 'Uploading...')
              : (isRTL ? 'اضغط للتحميل' : 'Click to upload')
            }
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP (max 10MB)
          </p>
        </motion.label>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden border border-border"
        >
          <img
            src={previewUrl}
            alt="Floor Plan"
            className="w-full h-64 object-contain bg-card"
          />
          
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <X className="h-4 w-4" />
          </button>

          {isAnalyzing && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                <p className="font-medium">{isRTL ? 'جاري التحليل...' : 'Analyzing...'}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Analysis Results */}
      {aiAnalysis && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h4 className="font-medium">{isRTL ? 'نتائج التحليل الذكي' : 'AI Analysis Results'}</h4>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm">
              <strong>{isRTL ? 'الغرف المكتشفة:' : 'Detected Rooms:'}</strong>{' '}
              {aiAnalysis.roomsDetected?.map(r => `${r.name} (${r.count})`).join(', ') || 'None'}
            </p>
            {aiAnalysis.estimatedArea && (
              <p className="text-sm">
                <strong>{isRTL ? 'المساحة التقديرية:' : 'Estimated Area:'}</strong>{' '}
                {aiAnalysis.estimatedArea} m²
              </p>
            )}
            {aiAnalysis.notes && (
              <p className="text-sm text-muted-foreground">{aiAnalysis.notes}</p>
            )}
          </div>

          <Button onClick={applyAiAnalysis} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            {isRTL ? 'تطبيق التوصيات' : 'Apply Recommendations'}
          </Button>
        </motion.div>
      )}

      {/* Skip button */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => setStep(2)}
      >
        {isRTL ? 'تخطي وإضافة الغرف يدوياً' : 'Skip and add rooms manually'}
      </Button>
    </div>
  );
}
