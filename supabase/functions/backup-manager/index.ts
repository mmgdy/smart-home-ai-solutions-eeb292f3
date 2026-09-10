import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    if (!adminId) return false;
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    return !!data && data.value === token;
  } catch {
    return false;
  }
}

function pemToBinaryDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getGoogleDriveAccessToken(sa: any): Promise<string> {
  const der = pemToBinaryDer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key,
  );

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(
      `Google OAuth token error: ${data.error_description || data.error || JSON.stringify(data)}`,
    );
  }
  return data.access_token;
}

const BACKUP_TABLES = [
  "categories",
  "brands",
  "products",
  "product_variants",
  "coupons",
  "quotes",
  "orders",
  "order_items",
  "site_info",
  "loyalty_points",
  "points_transactions",
  "wishlists",
] as const;

// Safe admin_settings keys to back up (exclude authentication tokens, hashes, and secrets)
const SAFE_ADMIN_SETTING_KEYS = [
  "logo_url",
  "logo_size",
  "favicon_url",
  "app_icon_url",
  "contact_email",
  "contact_phone",
  "store_currency",
  "tax_rate",
  "free_shipping_threshold",
  "google_drive_folder_id",
  "google_drive_auto_backup_enabled",
  "google_drive_backup_day",
];

async function collectBackupData(supabase: any) {
  const tablesData: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && Array.isArray(data)) {
        tablesData[table] = data;
        counts[table] = data.length;
      } else {
        tablesData[table] = [];
        counts[table] = 0;
      }
    } catch {
      tablesData[table] = [];
      counts[table] = 0;
    }
  }

  // Backup safe admin settings
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", SAFE_ADMIN_SETTING_KEYS);
    if (settings) {
      tablesData["admin_settings"] = settings;
      counts["admin_settings"] = settings.length;
    }
  } catch {
    tablesData["admin_settings"] = [];
    counts["admin_settings"] = 0;
  }

  const now = new Date();
  const timestamp = now.toISOString();

  return {
    app: "AzkaSmart",
    version: "1.0",
    created_at: timestamp,
    environment: "production",
    counts,
    tables: tablesData,
  };
}

async function uploadJsonToGoogleDrive(
  accessToken: string,
  folderId: string | null,
  fileName: string,
  jsonData: any,
) {
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: "application/json",
  };
  if (folderId && folderId.trim()) {
    metadata.parents = [folderId.trim()];
  }

  const fileContent = JSON.stringify(jsonData, null, 2);

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    fileContent +
    closeDelimiter;

  const uploadResp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    },
  );

  const result = await uploadResp.json();
  if (!uploadResp.ok) {
    throw new Error(
      `Google Drive upload failed: ${result.error?.message || JSON.stringify(result)}`,
    );
  }

  return result;
}

async function recordBackupHistory(
  supabase: any,
  entry: {
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
  },
) {
  try {
    const { data: cur } = await supabase
      .from("site_info")
      .select("value")
      .eq("section", "backups")
      .eq("key", "history")
      .maybeSingle();

    let list: any[] = [];
    try {
      list = cur?.value ? JSON.parse(cur.value) : [];
    } catch {
      list = [];
    }
    if (!Array.isArray(list)) list = [];

    list.unshift(entry);
    list = list.slice(0, 30); // Keep last 30 backup records

    await supabase.from("site_info").upsert(
      {
        section: "backups",
        key: "history",
        value: JSON.stringify(list),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "section,key" },
    );
  } catch (e) {
    console.error("Failed to record backup history:", e);
  }
}

async function resolveServiceAccountAndFolder(supabase: any) {
  let saJson: any = null;
  const envSa = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (envSa) {
    try {
      saJson = JSON.parse(envSa);
    } catch {}
  }

  let folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";

  if (!saJson || !folderId) {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "google_drive_service_account",
        "google_drive_folder_id",
        "google_drive_auto_backup_enabled",
      ]);

    if (settings) {
      for (const s of settings) {
        if (!saJson && s.key === "google_drive_service_account" && s.value) {
          try {
            saJson = JSON.parse(s.value);
          } catch {}
        }
        if (!folderId && s.key === "google_drive_folder_id" && s.value) {
          folderId = s.value;
        }
      }
    }
  }

  return { saJson, folderId };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 40 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const headerToken = authHeader.replace("Bearer ", "");
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const token = (typeof body.token === "string" ? body.token : undefined) || headerToken;
    const cronSecret = typeof body.cronSecret === "string" ? body.cronSecret : undefined;
    const expectedCronSecret = Deno.env.get("CRON_SECRET");

    const isCron = !!expectedCronSecret && cronSecret === expectedCronSecret;
    const isAdmin = await verifyAdminToken(supabase, token);

    const { action } = body;

    // Cron jobs only allowed to trigger weekly backup
    if (isCron && action === "cron-weekly-backup") {
      // Proceed to cron handler below
    } else if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION 1: create-backup (Returns entire database snapshot) ───────────
    if (action === "create-backup") {
      const backup = await collectBackupData(supabase);
      await recordBackupHistory(supabase, {
        id: crypto.randomUUID(),
        date: backup.created_at,
        type: "local",
        status: "success",
        file_name: `azkasmart_backup_${backup.created_at.slice(0, 10)}.json`,
        file_size_bytes: JSON.stringify(backup).length,
        counts: backup.counts,
      });

      return new Response(JSON.stringify({ success: true, backup }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION 2: get-config ───────────────────────────────────────────────
    if (action === "get-config") {
      const { saJson, folderId } = await resolveServiceAccountAndFolder(supabase);
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", [
          "google_drive_folder_id",
          "google_drive_auto_backup_enabled",
          "google_drive_backup_day",
        ]);

      let autoBackupEnabled = false;
      let backupDay = "Sunday";
      let storedFolderId = folderId || "";

      if (settings) {
        for (const s of settings) {
          if (s.key === "google_drive_auto_backup_enabled") {
            autoBackupEnabled = s.value === "true";
          }
          if (s.key === "google_drive_backup_day") {
            backupDay = s.value || "Sunday";
          }
          if (s.key === "google_drive_folder_id" && s.value) {
            storedFolderId = s.value;
          }
        }
      }

      const { data: historyData } = await supabase
        .from("site_info")
        .select("value")
        .eq("section", "backups")
        .eq("key", "history")
        .maybeSingle();

      let history: any[] = [];
      try {
        history = historyData?.value ? JSON.parse(historyData.value) : [];
      } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          config: {
            hasServiceAccount: !!(saJson?.client_email && saJson?.private_key),
            serviceAccountEmail: saJson?.client_email || null,
            folderId: storedFolderId,
            autoBackupEnabled,
            backupDay,
            history,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION 3: save-config ──────────────────────────────────────────────
    if (action === "save-config") {
      const { folderId, autoBackupEnabled, backupDay, serviceAccountJson } = body as any;
      const entries: Array<{ key: string; value: string }> = [];

      if (typeof folderId === "string") {
        entries.push({ key: "google_drive_folder_id", value: folderId.trim() });
      }
      if (typeof autoBackupEnabled === "boolean") {
        entries.push({
          key: "google_drive_auto_backup_enabled",
          value: autoBackupEnabled ? "true" : "false",
        });
      }
      if (typeof backupDay === "string") {
        entries.push({ key: "google_drive_backup_day", value: backupDay });
      }
      if (typeof serviceAccountJson === "string" && serviceAccountJson.trim()) {
        try {
          const parsed = JSON.parse(serviceAccountJson);
          if (!parsed.client_email || !parsed.private_key) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid Service Account JSON: client_email and private_key are required.",
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          entries.push({
            key: "google_drive_service_account",
            value: JSON.stringify(parsed),
          });
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: "Service Account JSON is not valid JSON." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      for (const entry of entries) {
        const { data: existing } = await supabase
          .from("admin_settings")
          .select("id")
          .eq("key", entry.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("admin_settings")
            .update({ value: entry.value, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase.from("admin_settings").insert(entry);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION 4: test-google-drive ────────────────────────────────────────
    if (action === "test-google-drive") {
      let testSa = (body as any).serviceAccountJson;
      let testFolder = (body as any).folderId;

      let saJson: any = null;
      if (typeof testSa === "string" && testSa.trim()) {
        try {
          saJson = JSON.parse(testSa);
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid JSON format for Service Account." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      if (!saJson) {
        const resolved = await resolveServiceAccountAndFolder(supabase);
        saJson = resolved.saJson;
        if (!testFolder) testFolder = resolved.folderId;
      }

      if (!saJson || !saJson.client_email || !saJson.private_key) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Service account is missing. Please provide or save the JSON key.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const accessToken = await getGoogleDriveAccessToken(saJson);

      let folderDetails: any = null;
      if (testFolder && testFolder.trim()) {
        const folderResp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(testFolder.trim())}?fields=id,name,mimeType,capabilities`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const folderData = await folderResp.json();
        if (!folderResp.ok) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Folder verification failed: ${folderData.error?.message || "Folder not accessible or not found. Ensure you shared the folder with " + saJson.client_email}`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        folderDetails = folderData;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Google Drive connection authenticated successfully!",
          clientEmail: saJson.client_email,
          folder: folderDetails
            ? { id: folderDetails.id, name: folderDetails.name }
            : { name: "Root Drive" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── ACTION 5: upload-google-drive / cron-weekly-backup ───────────────────
    if (action === "upload-google-drive" || action === "cron-weekly-backup") {
      const { saJson, folderId } = await resolveServiceAccountAndFolder(supabase);

      if (!saJson || !saJson.client_email || !saJson.private_key) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Google Drive Service Account is not configured.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const accessToken = await getGoogleDriveAccessToken(saJson);
      const backup = await collectBackupData(supabase);

      const dateStr = backup.created_at.slice(0, 19).replace(/[:T]/g, "-");
      const fileName = `azkasmart_backup_${dateStr}.json`;

      try {
        const driveFile = await uploadJsonToGoogleDrive(
          accessToken,
          folderId,
          fileName,
          backup,
        );

        const historyEntry = {
          id: crypto.randomUUID(),
          date: backup.created_at,
          type: "google_drive" as const,
          status: "success" as const,
          file_name: fileName,
          file_id: driveFile.id,
          web_link: driveFile.webViewLink,
          file_size_bytes: JSON.stringify(backup).length,
          counts: backup.counts,
        };
        await recordBackupHistory(supabase, historyEntry);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Backup successfully uploaded to Google Drive!",
            file: {
              id: driveFile.id,
              name: driveFile.name,
              webViewLink: driveFile.webViewLink,
            },
            counts: backup.counts,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err: any) {
        await recordBackupHistory(supabase, {
          id: crypto.randomUUID(),
          date: backup.created_at,
          type: "google_drive",
          status: "failed",
          file_name: fileName,
          error: String(err?.message || err),
        });
        throw err;
      }
    }

    // ─── ACTION 6: restore-backup ───────────────────────────────────────────
    if (action === "restore-backup") {
      const { backupData, selectedTables, mode = "merge" } = body as any;

      if (!backupData || typeof backupData !== "object" || !backupData.tables) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid backup data structure. Expected JSON with 'tables' property.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tablesToRestore: string[] = Array.isArray(selectedTables) && selectedTables.length > 0
        ? selectedTables
        : Object.keys(backupData.tables);

      const report: Record<
        string,
        { insertedOrUpdated: number; deleted: number; errors: string[] }
      > = {};

      // Restore order respecting foreign keys:
      const RESTORE_ORDER = [
        "categories",
        "brands",
        "products",
        "product_variants",
        "coupons",
        "quotes",
        "orders",
        "order_items",
        "site_info",
        "loyalty_points",
        "points_transactions",
        "wishlists",
        "admin_settings",
      ];

      const sortedTables = RESTORE_ORDER.filter((t) => tablesToRestore.includes(t));

      for (const table of sortedTables) {
        const rows = backupData.tables[table];
        report[table] = { insertedOrUpdated: 0, deleted: 0, errors: [] };

        if (!Array.isArray(rows) || rows.length === 0) continue;

        try {
          if (table === "admin_settings") {
            // Only restore safe keys
            const safeRows = rows.filter((r) =>
              SAFE_ADMIN_SETTING_KEYS.includes(r.key),
            );
            for (const r of safeRows) {
              const { error } = await supabase.from("admin_settings").upsert(
                { key: r.key, value: r.value, updated_at: new Date().toISOString() },
                { onConflict: "key" },
              );
              if (error) report[table].errors.push(error.message);
              else report[table].insertedOrUpdated++;
            }
            continue;
          }

          if (table === "site_info") {
            for (const r of rows) {
              const { error } = await supabase.from("site_info").upsert(
                {
                  section: r.section,
                  key: r.key,
                  value: r.value,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "section,key" },
              );
              if (error) report[table].errors.push(error.message);
              else report[table].insertedOrUpdated++;
            }
            continue;
          }

          // If mode is 'replace', delete current table rows first
          if (mode === "replace") {
            const { error: delErr } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
            if (delErr) {
              report[table].errors.push(`Delete error: ${delErr.message}`);
            }
          }

          // Chunk rows into batches of 50 for upsert
          const chunkSize = 50;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error: upsertErr } = await supabase.from(table).upsert(chunk, {
              ignoreDuplicates: false,
            });
            if (upsertErr) {
              report[table].errors.push(`Chunk ${i / chunkSize}: ${upsertErr.message}`);
            } else {
              report[table].insertedOrUpdated += chunk.length;
            }
          }
        } catch (tableErr: any) {
          report[table].errors.push(String(tableErr?.message || tableErr));
        }
      }

      return new Response(JSON.stringify({ success: true, report }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Backup manager error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
