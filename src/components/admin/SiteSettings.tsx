import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, Image, Lock, Eye, EyeOff, Save, LogOut, CheckCircle, Globe, Smartphone, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { applyFavicon } from '@/lib/favicon';

interface SiteSettingsProps {
  adminToken: string;
  onLogout: () => void;
}

export function SiteSettings({ adminToken, onLogout }: SiteSettingsProps) {
  const { toast } = useToast();
  
  // Dual theme logo settings
  const lightFileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(120);
  const [isUploadingLight, setIsUploadingLight] = useState(false);
  const [isUploadingDark, setIsUploadingDark] = useState(false);

  // Favicon settings
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // App icon (PWA) settings
  const appIconInputRef = useRef<HTMLInputElement>(null);
  const [appIconUrl, setAppIconUrl] = useState<string | null>(null);
  const [isUploadingAppIcon, setIsUploadingAppIcon] = useState(false);
  
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
        .in('key', ['logo_url', 'logo_light_url', 'logo_dark_url', 'logo_size', 'favicon_url', 'app_icon_url']);

      if (settings) {
        settings.forEach(s => {
          if (s.key === 'logo_url') setLogoUrl(s.value);
          if (s.key === 'logo_light_url') setLogoLightUrl(s.value);
          if (s.key === 'logo_dark_url') setLogoDarkUrl(s.value);
          if (s.key === 'logo_size') setLogoSize(parseInt(s.value || '100'));
          if (s.key === 'favicon_url') setFaviconUrl(s.value);
          if (s.key === 'app_icon_url') setAppIconUrl(s.value);
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleLightLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLight(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filename = `logo-light-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('admin-write', {
        body: { action: 'upload-file', token: adminToken, filename, base64, mimeType: file.type, bucket: 'site-assets' },
      });
      if (uploadError || !uploadData?.success) throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');

      const newLogoUrl = uploadData.publicUrl as string;
      setLogoLightUrl(newLogoUrl);
      if (!logoUrl) setLogoUrl(newLogoUrl);

      const { data: writeData, error: writeError } = await supabase.functions.invoke('admin-write', {
        body: {
          action: 'update-admin-settings',
          token: adminToken,
          entries: [
            { key: 'logo_light_url', value: newLogoUrl },
            { key: 'logo_url', value: newLogoUrl },
          ],
        },
      });
      if (writeError || !writeData?.success) {
        throw new Error(writeData?.error || writeError?.message || 'Failed to save settings');
      }

      window.dispatchEvent(new CustomEvent('azka-settings-updated'));

      toast({
        title: 'Light Theme Logo Updated',
        description: 'The light mode logo is now live across the website',
      });
    } catch (error: any) {
      console.error('Light logo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload light logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLight(false);
    }
  };

  const handleDarkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingDark(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filename = `logo-dark-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('admin-write', {
        body: { action: 'upload-file', token: adminToken, filename, base64, mimeType: file.type, bucket: 'site-assets' },
      });
      if (uploadError || !uploadData?.success) throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');

      const newLogoUrl = uploadData.publicUrl as string;
      setLogoDarkUrl(newLogoUrl);

      const { data: writeData, error: writeError } = await supabase.functions.invoke('admin-write', {
        body: {
          action: 'update-admin-settings',
          token: adminToken,
          entries: [
            { key: 'logo_dark_url', value: newLogoUrl },
          ],
        },
      });
      if (writeError || !writeData?.success) {
        throw new Error(writeData?.error || writeError?.message || 'Failed to save settings');
      }

      window.dispatchEvent(new CustomEvent('azka-settings-updated'));

      toast({
        title: 'Dark Theme Logo Updated',
        description: 'The dark mode logo is now live across the website',
      });
    } catch (error: any) {
      console.error('Dark logo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload dark logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingDark(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image (PNG, ICO, SVG)', variant: 'destructive' });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 1MB', variant: 'destructive' });
      return;
    }

    setIsUploadingFavicon(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'ico';
      const filename = `favicon-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('admin-write', {
        body: { action: 'upload-file', token: adminToken, filename, base64, mimeType: file.type, bucket: 'site-assets' },
      });
      if (uploadError || !uploadData?.success) throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');

      const newFaviconUrl = uploadData.publicUrl as string;
      setFaviconUrl(newFaviconUrl);

      const { data: writeData, error: writeError } = await supabase.functions.invoke('admin-write', {
        body: { action: 'update-admin-settings', token: adminToken, entries: [{ key: 'favicon_url', value: newFaviconUrl }] },
      });
      if (writeError || !writeData?.success) throw new Error(writeData?.error || writeError?.message || 'Failed to save favicon');

      // Apply immediately across tabs and browser
      applyFavicon(newFaviconUrl);
      window.dispatchEvent(new CustomEvent('azka-settings-updated'));

      toast({ title: 'Favicon updated', description: 'The new favicon is now live' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message || 'Failed to upload favicon', variant: 'destructive' });
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleSizeChange = async (value: number[]) => {
    const newSize = value[0];
    setLogoSize(newSize);

    try {
      await supabase.functions.invoke('admin-write', {
        body: {
          action: 'update-admin-settings',
          token: adminToken,
          entries: [{ key: 'logo_size', value: newSize.toString() }],
        },
      });
      window.dispatchEvent(new CustomEvent('azka-settings-updated'));
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
      {/* Dual Theme Logo Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Site Logos (Light & Dark Themes)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload distinct logos for each theme. The site automatically displays the matching logo when visitors switch between Light and Dark modes.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          {/* Light Theme Logo Card */}
          <div className="border border-border/80 rounded-xl p-5 bg-card/50 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <Label className="font-semibold text-base">Light Theme Logo</Label>
              </div>
              {logoLightUrl ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">Custom</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Default</span>
              )}
            </div>

            {/* Light canvas preview */}
            <div className="rounded-lg p-6 bg-white border border-slate-200 shadow-sm flex items-center justify-center min-h-[140px]">
              {(logoLightUrl || logoUrl) ? (
                <img
                  src={logoLightUrl || logoUrl || ''}
                  alt="Light Theme Logo"
                  style={{ height: `${Math.min(logoSize, 100)}px` }}
                  className="object-contain max-w-full"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Sun className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">No light logo uploaded</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={lightFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLightLogoUpload}
                className="hidden"
              />
              <Button
                onClick={() => lightFileInputRef.current?.click()}
                disabled={isUploadingLight}
                variant="outline"
                className="w-full"
              >
                {isUploadingLight ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Light Logo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Light Logo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Best against light backgrounds (PNG or SVG)
              </p>
            </div>
          </div>

          {/* Dark Theme Logo Card */}
          <div className="border border-border/80 rounded-xl p-5 bg-card/50 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-emerald-400" />
                <Label className="font-semibold text-base">Dark Theme Logo</Label>
              </div>
              {logoDarkUrl ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">Custom</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Default</span>
              )}
            </div>

            {/* Dark canvas preview */}
            <div className="rounded-lg p-6 bg-[#07130e] border border-emerald-900/60 shadow-sm flex items-center justify-center min-h-[140px]">
              {(logoDarkUrl || logoUrl) ? (
                <img
                  src={logoDarkUrl || logoUrl || ''}
                  alt="Dark Theme Logo"
                  style={{ height: `${Math.min(logoSize, 100)}px` }}
                  className="object-contain max-w-full"
                />
              ) : (
                <div className="text-center text-emerald-600/50">
                  <Moon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">No dark logo uploaded</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={darkFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleDarkLogoUpload}
                className="hidden"
              />
              <Button
                onClick={() => darkFileInputRef.current?.click()}
                disabled={isUploadingDark}
                variant="outline"
                className="w-full"
              >
                {isUploadingDark ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Dark Logo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Dark Logo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Best against dark backgrounds (PNG or SVG)
              </p>
            </div>
          </div>
        </div>

        {/* Shared Logo Size Slider */}
        <div className="pt-4 border-t border-border/60 max-w-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Logo Display Height</Label>
              <span className="text-sm font-medium text-primary">{logoSize}px</span>
            </div>
            <Slider
              value={[logoSize]}
              onValueChange={handleSizeChange}
              min={60}
              max={200}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Compact (60px)</span>
              <span>Large (200px)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Favicon Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Site Favicon
        </h2>
        <p className="text-muted-foreground mb-6">
          The small icon shown in browser tabs. Recommended: 32×32 or 64×64 PNG or ICO file.
        </p>

        <div className="flex items-center gap-6">
          <div className="border border-border rounded-lg p-4 bg-muted/30 flex items-center justify-center w-20 h-20 shrink-0">
            {faviconUrl ? (
              <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
            ) : (
              <Globe className="w-8 h-8 text-muted-foreground opacity-50" />
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*,.ico"
              onChange={handleFaviconUpload}
              className="hidden"
            />
            <Button
              onClick={() => faviconInputRef.current?.click()}
              disabled={isUploadingFavicon}
              variant="outline"
            >
              {isUploadingFavicon ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Upload Favicon</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">Max 1MB. Formats: PNG, ICO, SVG</p>
          </div>
        </div>
      </div>

      {/* App Icon (PWA) Upload Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          App Icon (PWA / Home Screen)
        </h2>
        <p className="text-muted-foreground mb-6">
          The icon shown when users install the app on their phone or desktop. Recommended: square 512×512 PNG with transparent or solid background.
        </p>

        <div className="flex items-center gap-6">
          <div className="border border-border rounded-2xl p-3 bg-muted/30 flex items-center justify-center w-24 h-24 shrink-0 overflow-hidden">
            {appIconUrl ? (
              <img src={appIconUrl} alt="App icon" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <Smartphone className="w-10 h-10 text-muted-foreground opacity-50" />
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={appIconInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  toast({ title: 'Invalid file type', description: 'Use PNG, JPG, or SVG', variant: 'destructive' });
                  return;
                }
                if (file.size > 2 * 1024 * 1024) {
                  toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' });
                  return;
                }
                setIsUploadingAppIcon(true);
                try {
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
                  const filename = `app-icon-${Date.now()}.${ext}`;
                  const { data: uploadData, error: uploadError } = await supabase.functions.invoke('admin-write', {
                    body: { action: 'upload-file', token: adminToken, filename, base64, mimeType: file.type, bucket: 'site-assets' },
                  });
                  if (uploadError || !uploadData?.success) throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');
                  const newUrl = uploadData.publicUrl as string;
                  setAppIconUrl(newUrl);
                  const { data: writeData, error: writeError } = await supabase.functions.invoke('admin-write', {
                    body: { action: 'update-admin-settings', token: adminToken, entries: [{ key: 'app_icon_url', value: newUrl }] },
                  });
                  if (writeError || !writeData?.success) throw new Error(writeData?.error || writeError?.message || 'Failed to save');
                  // Apply apple-touch-icon immediately for visual feedback
                  let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
                  if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple); }
                  apple.href = newUrl;
                  toast({ title: 'App icon updated', description: 'Users installing the app will see the new icon' });
                } catch (err: any) {
                  toast({ title: 'Upload failed', description: err.message || 'Failed to upload', variant: 'destructive' });
                } finally {
                  setIsUploadingAppIcon(false);
                }
              }}
              className="hidden"
            />
            <Button onClick={() => appIconInputRef.current?.click()} disabled={isUploadingAppIcon} variant="outline">
              {isUploadingAppIcon ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Upload App Icon</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">Max 2MB · 512×512 PNG recommended</p>
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
