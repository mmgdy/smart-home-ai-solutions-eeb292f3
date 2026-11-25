import { useState, useEffect, useRef, useCallback } from 'react';
import { FileImage, FileVideo, FileText, Trash2, Upload, ExternalLink, Search, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BRAND_LOGOS_BUCKET } from '@/lib/brandLogos';

const BUCKETS = [
  { id: 'product-images', label: 'Product Images', icon: FileImage, color: 'text-purple-600' },
  { id: 'product-videos', label: 'Product Videos', icon: FileVideo, color: 'text-emerald-600' },
  { id: 'brand-logos', label: 'Brand Logos', icon: FileImage, color: 'text-blue-600' },
  { id: 'site-assets', label: 'Site Assets', icon: FileText, color: 'text-amber-600' },
  { id: 'floor-plans', label: 'Floor Plans', icon: FileImage, color: 'text-rose-600' },
];

const MIME_CATEGORIES: { id: string; label: string; mimes: string[] }[] = [
  { id: 'all', label: 'All Files', mimes: [] },
  { id: 'images', label: 'Images', mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] },
  { id: 'videos', label: 'Videos', mimes: ['video/mp4', 'video/webm', 'video/quicktime'] },
  { id: 'documents', label: 'Documents', mimes: ['application/pdf', 'application/zip', 'application/x-zip-compressed'] },
];

function classifyFile(name: string, metadata?: any): 'image' | 'video' | 'document' | 'other' {
  const mime = (metadata?.mimetype || '').toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext) || mime.startsWith('image/')) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext) || mime.startsWith('video/')) return 'video';
  if (['pdf', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) || mime.includes('application/pdf') || mime.includes('zip')) return 'document';
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getPublicUrl(bucket: string, path: string, versionToken?: string | null): string {
  const cleaned = path.replace(/^\/+/, '');
  if (cleaned.startsWith('http')) return cleaned;
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleaned);
  const baseUrl = data.publicUrl;
  if (!versionToken) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}v=${encodeURIComponent(versionToken)}`;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface FileItem {
  name: string;
  id?: string;
  size: number;
  createdAt: string;
  publicUrl: string;
  mime: string;
  type: 'image' | 'video' | 'document' | 'other';
}

export default function MediaManager({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bucketIdx, setBucketIdx] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [deleting, setDeleting] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [updatingBuckets, setUpdatingBuckets] = useState(false);
  const [bucketCount, setBucketCount] = useState(BUCKETS.length);

  const bucket = BUCKETS[bucketIdx];
  const isBrandLogos = bucket.id === BRAND_LOGOS_BUCKET;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let rawFiles: any[] = [];
      if (adminToken) {
        const { data: res, error: fnErr } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: { action: 'list-files', bucket: bucket.id, limit: 1000, token: adminToken },
        });
        if (!fnErr && res?.success && Array.isArray(res.files)) {
          rawFiles = res.files;
        } else {
          const { data, error } = await supabase.storage
            .from(bucket.id)
            .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
          if (error) throw new Error(error.message);
          rawFiles = data ?? [];
        }
      } else {
        const { data, error } = await supabase.storage
          .from(bucket.id)
          .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw new Error(error.message);
        rawFiles = data ?? [];
      }

      const items: FileItem[] = rawFiles
        .filter((f: any) => f && f.id !== null && typeof f.name === 'string' && !f.name.endsWith('/') && f.name !== '.emptyFolderPlaceholder')
        .map((f: any) => {
          const name = f.name.replace(/^\/+/, '');
          const mime = f.metadata?.mimetype || 'application/octet-stream';
          const versionToken = f.updated_at || f.metadata?.eTag || f.created_at || null;
          return {
            name,
            id: f.id || name,
            size: f.metadata?.size ?? 0,
            createdAt: f.updated_at ?? f.metadata?.created_at ?? f.created_at ?? new Date().toISOString(),
            publicUrl: getPublicUrl(bucket.id, name, versionToken),
            mime,
            type: classifyFile(name, { mimetype: mime }),
          };
        });
      setFiles(items);
    } catch (err: any) {
      toast({ title: 'Failed to load files', description: err.message, variant: 'destructive' });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucket.id, adminToken, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!adminToken) {
      toast({ title: 'Admin session required', description: 'Please log in as admin to upload files.', variant: 'destructive' });
      return;
    }

    const selected = Array.from(fileList);
    setUploading(true);
    let uploadedCount = 0;
    let replacedCount = 0;
    let failedCount = 0;
    const existingNames = new Set(files.map((f) => f.name.toLowerCase()));

    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const cleanName = file.name.split(/[/\\]/).pop()?.trim() || '';
        if (!cleanName || cleanName.includes('..')) {
          failedCount++;
          continue;
        }
        if (isBrandLogos) {
          const isPng = cleanName.toLowerCase().endsWith('.png') || file.type === 'image/png';
          if (!isPng) {
            failedCount++;
            toast({
              variant: 'destructive',
              title: `${cleanName}: PNG required`,
              description: 'Brand logos must be transparent PNG files (e.g. aqara.png, tp-link.png).',
            });
            continue;
          }
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          failedCount++;
          toast({
            variant: 'destructive',
            title: `${cleanName} is too large`,
            description: 'Maximum file size is 8 MB.',
          });
          continue;
        }

        setUploadStatus(`Uploading ${i + 1}/${selected.length}: ${cleanName}...`);
        const base64 = await fileToBase64(file);
        const mimeType = isBrandLogos ? 'image/png' : (file.type || 'application/octet-stream');

        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: 'Bearer ' + adminToken },
          body: {
            action: 'upload-file',
            bucket: bucket.id,
            filename: cleanName,
            base64,
            mimeType,
            upsert: true,
            cacheControl: isBrandLogos ? '60' : '3600',
            token: adminToken,
          },
        });

        if (error || !data?.success) {
          failedCount++;
          console.error('Media upload failed:', error || data?.error);
        } else {
          if (existingNames.has(cleanName.toLowerCase())) {
            replacedCount++;
          } else {
            uploadedCount++;
          }
        }
      }

      if (uploadedCount > 0 || replacedCount > 0) {
        const parts: string[] = [];
        if (uploadedCount > 0) parts.push(`${uploadedCount} uploaded`);
        if (replacedCount > 0) parts.push(`${replacedCount} replaced`);
        toast({
          title: parts.join(', '),
          description: failedCount > 0 ? `${failedCount} file(s) failed.` : undefined,
        });
        await fetchFiles();
      } else if (failedCount > 0) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: `${failedCount} file(s) could not be uploaded.`,
        });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload error', description: err.message });
    } finally {
      setUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const refreshBuckets = async () => {
    setUpdatingBuckets(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      const knownIds = new Set(BUCKETS.slice(0, bucketCount).map(b => b.id));
      const newBuckets = data.filter((b: any) => b.name && !knownIds.has(b.name));
      for (const b of newBuckets) {
        if (b.name && !b.name.endsWith('/')) {
          BUCKETS.push({
            id: b.name,
            label: b.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            icon: FileImage,
            color: 'text-slate-600',
          });
        }
      }
      setBucketCount(BUCKETS.length);
      if (bucketIdx >= BUCKETS.length) setBucketIdx(0);
    } catch { /* ignore */ }
    finally { setUpdatingBuckets(false); }
  };

  const handleDelete = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    if (deleting.includes(fileId)) return;
    setDeleting(prev => [...prev, fileId]);
    try {
      const { data, error } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: 'Bearer ' + adminToken },
        body: {
          action: 'delete-file',
          bucket: bucket.id,
          paths: [file.name],
          token: adminToken,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Delete failed');
      }
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'File deleted', description: file.name });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(prev => prev.filter(id => id !== fileId));
    }
  };

  const getFilteredFiles = () => {
    let filtered = files;
    if (category !== 'all') {
      const cat = MIME_CATEGORIES.find(c => c.id === category);
      if (cat) {
        if (category === 'documents') filtered = filtered.filter(f => f.type === 'document');
        else filtered = filtered.filter(f => cat.mimes.includes(f.mime));
      }
      if (category === 'images') filtered = filtered.filter(f => f.type === 'image');
      else if (category === 'videos') filtered = filtered.filter(f => f.type === 'video');
      else if (category === 'documents') filtered = filtered.filter(f => f.type === 'document');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }
    return filtered;
  };

  return (
    <div className="space-y-6">
      {/* Bucket selector + Upload */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBuckets}
            disabled={updatingBuckets}
            className="gap-1.5"
          >
            {updatingBuckets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync Buckets
          </Button>
          {BUCKETS.slice(0, bucketCount).map((b, i) => (
            <Button
              key={b.id}
              variant={bucketIdx === i ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setBucketIdx(i); setFiles([]); setSearch(''); setCategory('all'); }}
              className="gap-1.5"
            >
              <b.icon className={`w-3.5 h-3.5 ${bucketIdx === i ? 'text-primary-foreground' : b.color}`} />
              {b.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={isBrandLogos ? 'image/png,.png' : 'image/*,video/*,.pdf'}
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading
              ? (uploadStatus || 'Uploading...')
              : isBrandLogos
                ? 'Upload PNG Logos'
                : 'Upload Files'}
          </Button>
        </div>
      </div>

      {isBrandLogos && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3.5 py-2.5 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Brand Logo Naming Rule (Transparent PNG for dark cards)</p>
          <p>
            Name each PNG file after the brand slug in lowercase with hyphens, e.g.{' '}
            <code className="text-foreground">aqara.png</code>, <code className="text-foreground">tp-link.png</code>,{' '}
            <code className="text-foreground">work-pro.png</code>, <code className="text-foreground">irona-jis.png</code>,{' '}
            <code className="text-foreground">hikvision.png</code> (exact brand names ignoring case/spaces also match).
            Uploading a file with the same name replaces the existing logo; deleting returns that brand to text fallback.
          </p>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files in this bucket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {MIME_CATEGORIES.map(c => (
            <Button
              key={c.id}
              variant={category === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c.id)}
              className="text-xs"
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* File grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileImage className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files found in this bucket.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {getFilteredFiles().map((file) => (
            <div key={file.id} className="group relative bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
              {/* Thumbnail */}
              <div className={`aspect-square flex items-center justify-center relative overflow-hidden ${isBrandLogos ? 'bg-[#0b1612] p-4' : 'bg-muted'}`}>
                {file.type === 'image' ? (
                  <img
                    src={file.publicUrl}
                    alt={file.name}
                    className={isBrandLogos ? 'max-h-14 max-w-[85%] w-auto h-auto object-contain bg-transparent' : 'w-full h-full object-cover'}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : file.type === 'video' ? (
                  <FileVideo className="w-10 h-10 text-primary" />
                ) : file.type === 'document' ? (
                  <FileText className="w-10 h-10 text-amber-600" />
                ) : (
                  <FileImage className="w-10 h-10 text-muted-foreground" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={`Delete ${file.name}`}
                  className="absolute top-2 right-2 h-7 w-7 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => handleDelete(file.id || file.name)}
                  disabled={deleting.includes(file.id || file.name)}
                >
                  {deleting.includes(file.id || file.name) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[10px] text-primary mt-1"
                  onClick={() => window.open(file.publicUrl, '_blank')}
                  type="button"
                >
                  Open <ExternalLink className="w-3 h-3 inline ml-0.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground pt-2 border-t">
        <span>Total: <strong className="text-foreground">{files.length}</strong> files</span>
        <span>Showing: <strong className="text-foreground">{getFilteredFiles().length}</strong></span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-medium">{bucket.label}</span>
        </span>
      </div>
    </div>
  );
}
