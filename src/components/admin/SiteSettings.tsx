import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, Image, Lock, Eye, EyeOff, Save, LogOut, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettingsProps {
  adminToken: string;
  onLogout: () => void;
}

export function SiteSettings({ adminToken, onLogout }: SiteSettingsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Logo settings
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  
  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['logo_url', 'logo_size']);

      if (settings) {
        settings.forEach(s => {
          if (s.key === 'logo_url') setLogoUrl(s.value);
          if (s.key === 'logo_size') setLogoSize(parseInt(s.value || '100'));
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName);

      const newLogoUrl = urlData.publicUrl;
      setLogoUrl(newLogoUrl);

      // Save to settings
      await supabase
        .from('admin_settings')
        .upsert({ key: 'logo_url', value: newLogoUrl }, { onConflict: 'key' });

      toast({
        title: 'Logo uploaded successfully',
        description: 'The new logo will be visible on the website',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSizeChange = async (value: number[]) => {
    const newSize = value[0];
    setLogoSize(newSize);

    try {
      await supabase
        .from('admin_settings')
        .upsert({ key: 'logo_size', value: newSize.toString() }, { onConflict: 'key' });
    } catch (error) {
      console.error('Failed to save logo size:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in both password fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'change-password', token: adminToken, newPassword },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to change password');
      }

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
      });

      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Failed to change password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.functions.invoke('admin-auth', {
        body: { action: 'logout', token: adminToken },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('admin_token');
    onLogout();
  };

  return (
    <div className="space-y-8">
      {/* Logo Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          Site Logo
        </h2>
        <p className="text-muted-foreground mb-6">
          Upload a new logo for your website. Recommended formats: PNG, SVG with transparent background.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Logo Preview */}
          <div className="space-y-4">
            <Label>Current Logo</Label>
            <div className="border border-border rounded-lg p-6 bg-muted/30 flex items-center justify-center min-h-[150px]">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Site Logo" 
                  style={{ height: `${logoSize}px` }}
                  className="object-contain max-w-full"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No custom logo uploaded</p>
                  <p className="text-xs">Using default logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload and Size Controls */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Upload New Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Logo File
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Max file size: 2MB. Formats: PNG, JPG, SVG
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Logo Size</Label>
                <span className="text-sm text-muted-foreground">{logoSize}px</span>
              </div>
              <Slider
                value={[logoSize]}
                onValueChange={handleSizeChange}
                min={40}
                max={200}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small (40px)</span>
                <span>Large (200px)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Change Password
        </h2>
        <p className="text-muted-foreground mb-6">
          Update your admin password. Use a strong password with at least 6 characters.
        </p>

        <div className="grid md:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <Button 
          onClick={handlePasswordChange}
          disabled={isChangingPassword}
          className="mt-4"
        >
          {isChangingPassword ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Changing...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Change Password
            </>
          )}
        </Button>
      </div>

      {/* Logout Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Logged in as Admin
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              You have full access to the admin panel
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
