import { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImageOff,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  MAX_GALLERY_IMAGES,
  appendGalleryImages,
  inferImageMimeType,
  isGifUrl,
  isSafeMediaUrl,
  removeGalleryImage,
  reorderGalleryImage,
} from '@/lib/productGallery';
import { cn } from '@/lib/utils';

interface ProductGalleryEditorProps {
  images: string[];
  onChange: (nextImages: string[]) => void;
  adminToken: string;
  maxImages?: number;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export function ProductGalleryEditor({
  images,
  onChange,
  adminToken,
  maxImages = MAX_GALLERY_IMAGES,
}: ProductGalleryEditorProps) {
  const { toast } = useToast();
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const atCap = images.length >= maxImages;
  const remainingSlots = Math.max(0, maxImages - images.length);

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!isSafeMediaUrl(trimmed)) {
      toast({
        variant: 'destructive',
        title: 'Invalid image URL',
        description: 'Enter a valid http(s):// URL or root-relative path.',
      });
      return;
    }
    const res = appendGalleryImages(images, [trimmed], maxImages);
    if (res.skippedDuplicateCount > 0) {
      toast({ title: 'Image already in gallery' });
      return;
    }
    if (res.skippedCapCount > 0) {
      toast({
        variant: 'destructive',
        title: `Gallery limit (${maxImages}) reached`,
        description: 'Remove an image before adding a new one.',
      });
      return;
    }
    onChange(res.next);
    setUrlInput('');
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (remainingSlots <= 0) {
      toast({
        variant: 'destructive',
        title: `Gallery limit (${maxImages}) reached`,
        description: 'Remove an existing image before uploading another.',
      });
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const skippedForCap = files.length - acceptedFiles.length;

    setUploading(true);
    const uploadedUrls: string[] = [];
    let failedCount = 0;

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        if (file.size > MAX_UPLOAD_BYTES) {
          failedCount++;
          toast({
            variant: 'destructive',
            title: `${file.name} is too large`,
            description: 'Maximum image size is 8 MB.',
          });
          continue;
        }
        setUploadStatus(`Uploading ${i + 1}/${acceptedFiles.length}...`);
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = inferImageMimeType(file);
        const path = `manual/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const base64 = await fileToBase64(file);

        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: {
            action: 'upload-file',
            bucket: 'product-images',
            filename: path,
            base64,
            mimeType,
          },
        });

        if (error || !data?.success || !data?.publicUrl) {
          failedCount++;
          console.error('Gallery image upload failed:', error || data?.error);
        } else {
          uploadedUrls.push(String(data.publicUrl));
        }
      }

      if (uploadedUrls.length > 0) {
        const res = appendGalleryImages(images, uploadedUrls, maxImages);
        onChange(res.next);
        toast({
          title:
            res.addedCount === 1
              ? 'Added 1 image to gallery'
              : `Added ${res.addedCount} images to gallery`,
          description:
            skippedForCap > 0
              ? `${skippedForCap} file(s) skipped due to ${maxImages}-image limit.`
              : undefined,
        });
      } else if (failedCount > 0) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: 'Could not upload selected image file(s).',
        });
      }
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIndex !== null && dragIndex !== targetIdx) {
      onChange(reorderGalleryImage(images, dragIndex, targetIdx));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Gallery Images</Label>
            <Badge variant={atCap ? 'secondary' : 'outline'} className="font-mono text-[11px]">
              {images.length} / {maxImages}
              {images.length > maxImages ? ' (existing)' : ''}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            First image is the main card & product photo. Drag or use arrows to reorder. Supports JPG, PNG, WebP, and animated GIF.
          </p>
        </div>
      </div>

      {/* Ordered thumbnail strip */}
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2.5" data-testid="admin-gallery-list">
          {images.map((url, idx) => {
            const isBroken = Boolean(brokenThumbs[url]);
            const isGif = isGifUrl(url);
            return (
              <div
                key={`${url}-${idx}`}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === idx) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(idx);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={cn(
                  'group relative w-24 rounded-lg border bg-card p-1.5 transition-all select-none',
                  idx === 0 ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                  dragIndex === idx && 'opacity-50',
                  dragOverIndex === idx && dragIndex !== idx && 'border-primary border-dashed scale-[1.03]'
                )}
              >
                {/* Top bar: Main/#idx + remove */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      idx === 0
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-2.5 w-2.5 cursor-grab" />
                    {idx === 0 ? 'Main' : `#${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove gallery image ${idx + 1}`}
                    onClick={() => onChange(removeGalleryImage(images, idx))}
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Thumbnail preview */}
                <div className="relative h-16 w-full rounded bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden">
                  {isBroken ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
                      <ImageOff className="h-4 w-4 mb-0.5 text-destructive/70" />
                      <span className="text-[9px] leading-none">Failed</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Gallery item ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain p-0.5"
                      onError={() =>
                        setBrokenThumbs((prev) => ({ ...prev, [url]: true }))
                      }
                    />
                  )}
                  {isGif && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
                      GIF
                    </span>
                  )}
                </div>

                {/* Reorder buttons */}
                <div className="mt-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    aria-label={`Move image ${idx + 1} left`}
                    disabled={idx === 0}
                    onClick={() => onChange(reorderGalleryImage(images, idx, idx - 1))}
                    className="flex-1 h-6 rounded border border-border/70 bg-background hover:bg-muted disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center"
                    title="Move left"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move image ${idx + 1} right`}
                    disabled={idx === images.length - 1}
                    onClick={() => onChange(reorderGalleryImage(images, idx, idx + 1))}
                    className="flex-1 h-6 rounded border border-border/70 bg-background hover:bg-muted disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center"
                    title="Move right"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
          No gallery images yet. Upload image files or paste a URL below.
        </div>
      )}

      {/* Add image controls: both File Upload (multi) and Paste URL */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        <input
          ref={galleryFileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif,.jpg,.jpeg,.png,.gif,.webp,.avif"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            handleFilesSelected(files).finally(() => {
              if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
            });
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || atCap}
          onClick={() => galleryFileInputRef.current?.click()}
          className="shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
          )}
          {uploading ? uploadStatus || 'Uploading...' : 'Add image(s)'}
        </Button>

        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            placeholder={atCap ? `Gallery limit (${maxImages}) reached` : 'Paste image or GIF URL (https://…)'}
            disabled={atCap}
            className="text-sm h-9 min-w-0 flex-1"
            dir="ltr"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={atCap || !urlInput.trim()}
            onClick={handleAddUrl}
            className="shrink-0 h-9"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add URL
          </Button>
        </div>
      </div>

      {atCap && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          {images.length > maxImages
            ? `This product already has ${images.length} images. Existing photos are preserved; remove images below ${maxImages} before adding new ones.`
            : `Maximum of ${maxImages} gallery images reached. Remove an image to add another.`}
        </p>
      )}
    </div>
  );
}
