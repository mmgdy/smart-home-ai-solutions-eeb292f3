import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileJson,
  Layers,
  Check,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BackupManagerProps {
  adminToken: string;
}

interface BackupHistoryItem {
  id: string;
  date: string;
  type: "local" | "google_drive";
  status: "success" | "failed";
  file_name: string;
  file_id?: string;
  web_link?: string;
  file_size_bytes?: number;
  counts?: Record<string, number>;
  error?: string;
}

interface GoogleDriveConfig {
  hasServiceAccount: boolean;
  serviceAccountEmail: string | null;
  folderId: string;
  autoBackupEnabled: boolean;
  backupDay: string;
  history: BackupHistoryItem[];
}

export function BackupManager({ adminToken }: BackupManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Config
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [config, setConfig] = useState<GoogleDriveConfig>({
    hasServiceAccount: false,
    serviceAccountEmail: null,
    folderId: "",
    autoBackupEnabled: false,
    backupDay: "Sunday",
    history: [],
  });

  // Settings form
  const [folderIdInput, setFolderIdInput] = useState("");
  const [serviceAccountJsonInput, setServiceAccountJsonInput] = useState("");
  const [autoBackupEnabledInput, setAutoBackupEnabledInput] = useState(false);
  const [backupDayInput, setBackupDayInput] = useState("Sunday");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Backup operations
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [lastLocalBackupStats, setLastLocalBackupStats] = useState<Record<string, number> | null>(null);

  // Restore operations
  const [uploadedBackup, setUploadedBackup] = useState<any>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreReport, setRestoreReport] = useState<any>(null);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { action: "get-config", token: adminToken },
      });

      if (error) throw error;
      if (data?.config) {
        setConfig(data.config);
        setFolderIdInput(data.config.folderId || "");
        setAutoBackupEnabledInput(data.config.autoBackupEnabled || false);
        setBackupDayInput(data.config.backupDay || "Sunday");
      }
    } catch (err: any) {
      console.error("Failed to load backup config:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // 1. Download Backup to Computer
  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { action: "create-backup", token: adminToken },
      });

      if (error || !data?.backup) {
        throw new Error(error?.message || data?.error || "Failed to generate backup");
      }

      const backupData = data.backup;
      setLastLocalBackupStats(backupData.counts || null);

      // Trigger browser download
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `azkasmart_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Downloaded Successfully",
        description: `Saved to your computer. Total records: ${Object.values(backupData.counts || {}).reduce((a: any, b: any) => a + b, 0)}`,
      });

      loadConfig();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: err.message || "Could not generate backup file.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Upload Backup to Google Drive
  const handleBackupToGoogleDrive = async () => {
    if (!config.hasServiceAccount && !serviceAccountJsonInput) {
      toast({
        variant: "destructive",
        title: "Google Drive Not Configured",
        description: "Please configure and save Google Drive credentials in the settings tab first.",
      });
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { action: "upload-google-drive", token: adminToken },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Failed to upload to Google Drive");
      }

      toast({
        title: "Backup Uploaded to Google Drive!",
        description: data.file?.name
          ? `File: ${data.file.name}`
          : "Backup successfully stored in your Google Drive folder.",
      });

      loadConfig();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Google Drive Backup Failed",
        description: err.message || "Check your Service Account permissions and Folder ID.",
      });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // 3. Test Google Drive Connection
  const handleTestDriveConnection = async () => {
    setIsTestingDrive(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          action: "test-google-drive",
          token: adminToken,
          serviceAccountJson: serviceAccountJsonInput || undefined,
          folderId: folderIdInput || undefined,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Connection test failed");
      }

      setTestResult({
        success: true,
        message: `${data.message} Connected folder: "${data.folder?.name || "Root"}" (Account: ${data.clientEmail})`,
      });
      toast({
        title: "Google Drive Connected",
        description: "Authenticated successfully with access to the target folder.",
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Authentication failed. Check your JSON key and folder permissions.",
      });
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: err.message || "Could not connect to Google Drive.",
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  // 4. Save Google Drive Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          action: "save-config",
          token: adminToken,
          folderId: folderIdInput,
          autoBackupEnabled: autoBackupEnabledInput,
          backupDay: backupDayInput,
          serviceAccountJson: serviceAccountJsonInput || undefined,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Failed to save settings");
      }

      toast({
        title: "Settings Saved",
        description: "Google Drive backup settings have been updated.",
      });
      setServiceAccountJsonInput(""); // Clear sensitive input after saving
      loadConfig();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Save",
        description: err.message || "Could not update settings.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 5. Handle File Selection for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.tables || typeof json.tables !== "object") {
          throw new Error("Invalid backup format: 'tables' object missing.");
        }
        setUploadedBackup(json);
        setSelectedTables(Object.keys(json.tables));
        setRestoreReport(null);
        toast({
          title: "Backup File Loaded",
          description: `Found ${Object.keys(json.tables).length} tables from ${json.created_at ? new Date(json.created_at).toLocaleDateString() : "unknown date"}.`,
        });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Invalid Backup File",
          description: err.message || "The selected file is not a valid JSON backup.",
        });
        setUploadedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // 6. Execute Restore
  const handleExecuteRestore = async () => {
    if (!uploadedBackup) return;
    setShowConfirmRestore(false);
    setIsRestoring(true);
    setRestoreProgress(15);

    try {
      setRestoreProgress(45);
      const { data, error } = await supabase.functions.invoke("backup-manager", {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          action: "restore-backup",
          token: adminToken,
          backupData: uploadedBackup,
          selectedTables,
          mode: restoreMode,
        },
      });

      setRestoreProgress(90);

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Restore execution failed");
      }

      setRestoreReport(data.report);
      setRestoreProgress(100);

      toast({
        title: "Restore Completed",
        description: "Selected tables have been restored successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: err.message || "An error occurred during restore.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const selectAllTables = () => {
    if (uploadedBackup?.tables) {
      setSelectedTables(Object.keys(uploadedBackup.tables));
    }
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  const lastBackup = config.history?.[0];

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Card 1 */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Google Drive Status
            </p>
            <div className="flex items-center gap-2 mt-1">
              {config.hasServiceAccount ? (
                <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Not Configured
                </Badge>
              )}
            </div>
            {config.serviceAccountEmail && (
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={config.serviceAccountEmail}>
                {config.serviceAccountEmail}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Cloud className="w-6 h-6" />
          </div>
        </div>

        {/* Status Card 2 */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Automatic Weekly Backup
            </p>
            <div className="flex items-center gap-2 mt-1">
              {config.autoBackupEnabled ? (
                <Badge variant="default" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Active ({config.backupDay})
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Runs every {config.backupDay} at 03:00 UTC</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Status Card 3 */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Last Backup
            </p>
            <p className="font-semibold text-sm mt-1">
              {lastBackup?.date
                ? new Date(lastBackup.date).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
                : "No backups recorded"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {lastBackup ? `${lastBackup.type.replace("_", " ")} (${lastBackup.status})` : "Ready to create"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Subtabs */}
      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Backup & Save</span>
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Restore</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Google Drive</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: BACKUP & SAVE ───────────────────────────────────────── */}
        <TabsContent value="backup" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action 1: Download to Computer */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Download to Computer (تنزيل نسخة للكمبيوتر)</h3>
                    <p className="text-xs text-muted-foreground">Save full snapshot directly to your device</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Generates an unencrypted, complete JSON backup containing all store products, categories, brands, orders, customer details, custom bundles, coupons, and site settings.
                </p>
                <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5 mb-6 text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span>Included in this backup:</span>
                  </div>
                  <p>• Products, Images, Variants & Prices</p>
                  <p>• Orders, Order Items & Customer Data</p>
                  <p>• Categories, Brands & Navigation</p>
                  <p>• Site Settings, Custom Bundles & Coupons</p>
                </div>
              </div>

              <Button
                onClick={handleDownloadBackup}
                disabled={isDownloading}
                size="lg"
                className="w-full gap-2 shadow-sm"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Snapshot...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Backup (.json)
                  </>
                )}
              </Button>
            </div>

            {/* Action 2: Backup to Google Drive */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Save to Google Drive (حفظ في Google Drive)</h3>
                    <p className="text-xs text-muted-foreground">Instant upload to your cloud storage</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Takes a fresh database snapshot and uploads it directly to your designated Google Drive folder. Perfect for off-site disaster recovery and team archiving.
                </p>

                <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Target Folder:</span>
                    <span className="font-mono font-medium truncate max-w-[180px]">
                      {config.folderId || "Root Drive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cloud Account:</span>
                    <span className="font-medium text-green-600 truncate max-w-[180px]">
                      {config.serviceAccountEmail ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleBackupToGoogleDrive}
                disabled={isUploadingToDrive || !config.hasServiceAccount}
                variant={config.hasServiceAccount ? "default" : "outline"}
                size="lg"
                className="w-full gap-2"
              >
                {isUploadingToDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading to Google Drive...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    {config.hasServiceAccount ? "Backup to Google Drive Now" : "Configure Drive First"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Last Local Download Report */}
          {lastLocalBackupStats && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Snapshot Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {Object.entries(lastLocalBackupStats).map(([table, count]) => (
                  <div key={table} className="bg-muted/40 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{table.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 2: RESTORE ─────────────────────────────────────────────── */}
        <TabsContent value="restore" className="mt-6 space-y-6">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer bg-card"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base mb-1">Select or Drop Backup File (.json)</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Choose a previously downloaded AzkaSmart backup file from your computer to inspect and restore.
            </p>
          </div>

          {/* Uploaded Backup Preview */}
          {uploadedBackup && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Backup Inspection</h4>
                    <p className="text-xs text-muted-foreground">
                      Created: {uploadedBackup.created_at ? new Date(uploadedBackup.created_at).toLocaleString() : "Unknown"} | Version: {uploadedBackup.version || "1.0"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllTables}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTables}>
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Table Selection Grid */}
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground mb-3 block">
                  Select Tables to Restore ({selectedTables.length} selected)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(uploadedBackup.tables || {}).map(([table, rows]: [string, any]) => {
                    const isSelected = selectedTables.includes(table);
                    const count = Array.isArray(rows) ? rows.length : 0;
                    return (
                      <div
                        key={table}
                        onClick={() => toggleTableSelection(table)}
                        className={`border rounded-lg p-3 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? "bg-primary/5 border-primary/40 text-foreground" : "bg-muted/20 border-border text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleTableSelection(table)} />
                          <span className="text-sm font-medium capitalize truncate">
                            {table.replace("_", " ")}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strategy Selection */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <Label className="text-sm font-semibold">Restore Mode (استراتيجية الاستعادة)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRestoreMode("merge")}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      restoreMode === "merge" ? "bg-card border-primary shadow-sm" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm mb-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${restoreMode === "merge" ? "border-primary" : "border-muted-foreground"}`}>
                        {restoreMode === "merge" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      Merge & Update (دمج وتحديث - موصى به)
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      Updates existing rows by ID and adds new ones. Existing data not in the backup is preserved safely.
                    </p>
                  </div>

                  <div
                    onClick={() => setRestoreMode("replace")}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      restoreMode === "replace" ? "bg-card border-destructive shadow-sm" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm mb-1 text-destructive">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${restoreMode === "replace" ? "border-destructive" : "border-muted-foreground"}`}>
                        {restoreMode === "replace" && <div className="w-2 h-2 rounded-full bg-destructive" />}
                      </div>
                      Clean Overwrite (استبدال شامل)
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      Cleans the selected tables before importing the backup data. Use for complete disaster recovery.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadedBackup(null)}
                  disabled={isRestoring}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmRestore(true)}
                  disabled={isRestoring || selectedTables.length === 0}
                  variant={restoreMode === "replace" ? "destructive" : "default"}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Restore {selectedTables.length} Tables
                </Button>
              </div>

              {/* Progress Bar */}
              {isRestoring && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Restoring tables sequentially...</span>
                    <span>{restoreProgress}%</span>
                  </div>
                  <Progress value={restoreProgress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Restore Report */}
          {restoreReport && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Restore Execution Report
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {Object.entries(restoreReport).map(([table, res]: [string, any]) => (
                  <div key={table} className="flex items-center justify-between p-2.5 rounded bg-muted/30 text-xs">
                    <span className="font-medium capitalize">{table.replace("_", " ")}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">✓ {res.insertedOrUpdated} items restored</span>
                      {res.errors?.length > 0 && (
                        <span className="text-destructive font-medium">⚠️ {res.errors.length} errors</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 3: GOOGLE DRIVE SETTINGS ───────────────────────────────── */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" />
                Google Drive & Automated Weekly Backup
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure headless server-to-server backups directly into your Google Drive folder.
              </p>
            </div>

            {/* Schedule Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Automatic Weekly Backup</Label>
                <p className="text-xs text-muted-foreground">
                  Triggers an automated cloud backup once a week at 03:00 AM UTC
                </p>
              </div>
              <Switch
                checked={autoBackupEnabledInput}
                onCheckedChange={setAutoBackupEnabledInput}
              />
            </div>

            {/* Day of Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backupDay">Backup Day</Label>
                <select
                  id="backupDay"
                  value={backupDayInput}
                  onChange={(e) => setBackupDayInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Sunday">Sunday (الأحد)</option>
                  <option value="Monday">Monday (الاثنين)</option>
                  <option value="Tuesday">Tuesday (الثلاثاء)</option>
                  <option value="Wednesday">Wednesday (الأربعاء)</option>
                  <option value="Thursday">Thursday (الخميس)</option>
                  <option value="Friday">Friday (الجمعة)</option>
                  <option value="Saturday">Saturday (السبت)</option>
                </select>
              </div>

              {/* Folder ID */}
              <div className="space-y-2">
                <Label htmlFor="folderId">
                  Google Drive Folder ID
                </Label>
                <Input
                  id="folderId"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBHK... (from URL)"
                  value={folderIdInput}
                  onChange={(e) => setFolderIdInput(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Open your Google Drive folder; the ID is the long string at the end of the URL.
                </p>
              </div>
            </div>

            {/* Service Account JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="saJson">Google Cloud Service Account JSON Key</Label>
                {config.hasServiceAccount && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                    Key already saved on server
                  </Badge>
                )}
              </div>
              <Textarea
                id="saJson"
                rows={4}
                placeholder={
                  config.hasServiceAccount
                    ? "Leave blank to keep existing key, or paste new JSON to replace it..."
                    : 'Paste the contents of your downloaded Service Account .json file here {"type":"service_account",...}'
                }
                value={serviceAccountJsonInput}
                onChange={(e) => setServiceAccountJsonInput(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Test Connection Result Alert */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Settings Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestDriveConnection}
                disabled={isTestingDrive}
                className="gap-2"
              >
                {isTestingDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Test Connection (فحص الاتصال)
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Settings (حفظ الإعدادات)</>
                )}
              </Button>
            </div>

            {/* Setup Instructions Box */}
            <div className="mt-8 border border-border rounded-xl p-5 bg-muted/20 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                كيفية إعداد حساب Google Drive مجاناً في دقيقتين (How to setup in 2 mins)
              </h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  ادخل إلى <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a> وأنشئ مشروعاً مجانياً.
                </li>
                <li>
                  فعل خدمة <strong>Google Drive API</strong> من قائمة <em>APIs & Services</em>.
                </li>
                <li>
                  توجه إلى <em>Credentials &rarr; Create Credentials &rarr; Service Account</em> وحمّل المفتاح بصيغة <strong>JSON</strong>.
                </li>
                <li>
                  أنشئ مجلداً على Google Drive الخاص بك واضغط <strong>Share</strong> وشارك المجلد مع إيميل الـ Service Account بصلاحية <strong>Editor</strong>.
                </li>
                <li>
                  انسخ معرّف المجلد من الرابط وضعه في خانة <strong>Folder ID</strong>، ثم الصق محتوى المفتاح واضغط <strong>Save</strong>.
                </li>
              </ol>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 4: BACKUP HISTORY ──────────────────────────────────────── */}
        <TabsContent value="history" className="mt-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Backup History Log (سجل النسخ السابقة)
            </h3>

            {config.history?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No backup operations recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase border-b border-border bg-muted/30">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {config.history.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium whitespace-nowrap">
                          {new Date(item.date).toLocaleString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {item.type === "google_drive" ? "Google Drive" : "Local Download"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs truncate max-w-[200px]" title={item.file_name}>
                          {item.file_name}
                        </td>
                        <td className="py-3 px-4">
                          {item.status === "success" ? (
                            <span className="text-green-600 font-medium text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Success
                            </span>
                          ) : (
                            <span className="text-destructive font-medium text-xs flex items-center gap-1" title={item.error}>
                              <AlertCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {item.file_size_bytes ? `${Math.round(item.file_size_bytes / 1024)} KB` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.web_link ? (
                            <a
                              href={item.web_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Restore */}
      <AlertDialog open={showConfirmRestore} onOpenChange={setShowConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Database Restore
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                You are about to restore <strong>{selectedTables.length} tables</strong> using the{" "}
                <strong>{restoreMode === "merge" ? "Merge & Update (Safe Upsert)" : "Clean Overwrite (Replace All)"}</strong> strategy.
              </p>
              {restoreMode === "replace" && (
                <p className="text-destructive font-medium">
                  Warning: Clean Overwrite will delete current data in the selected tables before importing!
                </p>
              )}
              <p>Are you sure you want to proceed with this operation?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteRestore}
              className={restoreMode === "replace" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Yes, Restore Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BackupManager;
