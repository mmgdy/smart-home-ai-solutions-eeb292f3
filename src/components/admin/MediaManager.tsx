import { useState } from 'react';
import { FileImage, FileVideo, FileText, ChevronDown, Trash2, Upload, ExternalLink, X, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

function getPublicUrl(bucket: string, path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  if (cleaned.startsWith('http')) return cleaned;
  return `https://djsibxhkfvwtjzvnjmhp.supabase.co/storage/v1/object/public/${bucket}/${encodeURIComponent(cleaned)}`;
}

interface FileItem {
  name: string;
  id: string;
  size: number;
  createdAt: string;
  publicUrl: string;
  mime: string;
  type: 'image' | 'video' | 'document' | 'other';
}

interface BucketFile {
  name: string;
  id?: string;
  metadata?: { mimetype?: string; size?: number; created_at?: string };
}

export default function MediaManager({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [bucketIdx, setBucketIdx] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [updatingBuckets, setUpdatingBuckets] = useState(false);

  const bucket = BUCKETS[bucketIdx];

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/storage/v1/object/list/bucket/${bucket.id}?pg=1&per_page=200&sort_by=created_at.asc`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      if (!res.ok) throw new Error(`Failed to list files (${res.status})`);
      const data: BucketFile[] = await res.json();
      const items: FileItem[] = data.map((f) => {
        const name = f.name.replace(/^\/+/, '');
        const mime = (f.metadata?.mimetype || 'application/octet-stream');
        return {
          name,
          id: f.id || name,
          size: f.metadata?.size ?? 0,
          createdAt: f.metadata?.created_at ?? new Date().toISOString(),
          publicUrl: getPublicUrl(bucket.id, name),
          mime,
          type: classifyFile(name, { mimetype: mime }),
        };
      });
      // Filter: folders are items ending with / or items that are prefixes
      const fileItems = items.filter((f) => !f.name.endsWith('/') && f.size > 0);
      setFiles(fileItems);
    } catch (err: any) {
      toast({ title: 'Failed to load files', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const refreshBuckets = async () => {
    setUpdatingBuckets(true);
    try {
      const res = await fetch('https://api.supabase.com/v1/storage/buckets', {
        headers: { Authorization: `Bearer ${adminToken}`, apikey: adminToken },
      });
      if (res.ok) {
        const buckets = await res.json();
        // Check for buckets not in our list
        const knownIds = new Set(BUCKETS.map(b => b.id));
        const newBuckets = buckets.filter((b: any) => b.name && !knownIds.has(b.name));
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
        if (bucketIdx >= BUCKETS.length) setBucketIdx(0);
      }
    } catch { /* ignore */ }
    finally { setUpdatingBuckets(false); }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm(`Delete "${files.find(f => f.id === fileId)?.name}"? This cannot be undone.`)) return;
    if (deleting.includes(fileId)) return;
    setDeleting(prev => [...prev, fileId]);
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;
      const res = await fetch(`https://api.supabase.com/v1/storage/v1/object/bucket/${bucket.id}${file.name.startsWith('/') ? '' : '/'}${encodeURIComponent(file.name)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          apikey: adminToken,
        },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
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
      if (cat) { filtered = filtered.filter(f => cat.mimes.includes(f.mime) || f.type === cat.id === 'documents' ? 'document' : f.type); }
      // Simpler: match type
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
      {/* Bucket selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={refreshBuckets}
          disabled={updatingBuckets}
          className="gap-1.5"
        >
          {updatingBuckets && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <Upload className="w-3.5 h-3.5" /> Sync Buckets
        </Button>
        {BUCKETS.map((b, i) => (
          <Button
            key={b.id}
            variant={bucketIdx === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setBucketIdx(i); setLoading(true); setFiles([]); setSearch(''); setCategory('all'); }}
            className="gap-1.5"
          >
            <b.icon className={`w-3.5 h-3.5 ${bucketIdx === i ? 'text-primary-foreground' : b.color}`} />
            {b.label}
          </Button>
        ))}
      </div>

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
              <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                {file.type === 'image' ? (
                  <img
                    src={file.publicUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
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
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(file.id)}
                  disabled={deleting.includes(file.id)}
                >
                  {deleting.includes(file.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
