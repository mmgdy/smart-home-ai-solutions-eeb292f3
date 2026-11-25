import { normalizeXPayMode, type XPayMode } from "./xpay.ts";

export interface XPayPublicConfig {
  enabled: boolean;
  mode: XPayMode;
  publishableKey: string;
  publishableKeyTest: string;
  publishableKeyLive: string;
  cardFeePercent: number;
  cardFeeFixed: number;
}

export async function readXPayPublicConfig(supabase: any): Promise<XPayPublicConfig> {
  const { data: rows } = await supabase
    .from("site_info")
    .select("key, value")
    .eq("section", "payment")
    .like("key", "xpay_%");

  const map: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row?.key) map[row.key] = String(row.value ?? "");
  }

  const mode = normalizeXPayMode(map.xpay_mode);
  const pkTest = (map.xpay_publishable_key_test || "").trim();
  const pkLive = (map.xpay_publishable_key_live || "").trim();
  const activePk =
    (mode === "live" ? pkLive : pkTest) || (map.xpay_publishable_key || "").trim();

  return {
    enabled: map.xpay_enabled === "true",
    mode,
    publishableKey: activePk,
    publishableKeyTest: pkTest,
    publishableKeyLive: pkLive,
    cardFeePercent: Math.max(0, Number(map.xpay_card_fee_percent) || 0),
    cardFeeFixed: Math.max(0, Number(map.xpay_card_fee_fixed) || 0),
  };
}

export async function readServerSecret(
  supabase: any,
  dbKey: string,
  envNames: string[],
  requiredPrefix: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("payment_secrets")
      .select("value")
      .eq("key", dbKey)
      .maybeSingle();
    const dbVal = typeof data?.value === "string" ? data.value.trim() : "";
    if (dbVal && dbVal.startsWith(requiredPrefix)) {
      return dbVal;
    }
  } catch {
    // payment_secrets table may not exist during first deploy; fall back to env vars safely
  }

  for (const name of envNames) {
    const envVal = (Deno.env.get(name) || "").trim();
    if (envVal && envVal.startsWith(requiredPrefix)) {
      return envVal;
    }
  }

  return null;
}

export async function resolveXPaySecretKey(supabase: any, mode: XPayMode): Promise<string | null> {
  if (mode === "live") {
    return readServerSecret(
      supabase,
      "xpay_secret_key_live",
      ["XPAY_SECRET_KEY_LIVE", "XPAY_SECRET_KEY"],
      "sk_live_"
    );
  }
  return readServerSecret(
    supabase,
    "xpay_secret_key_test",
    ["XPAY_SECRET_KEY_TEST", "XPAY_SECRET_KEY"],
    "sk_test_"
  );
}

export async function resolveXPayWebhookSecrets(
  supabase: any
): Promise<{ test: string | null; live: string | null }> {
  const [testSecret, liveSecret] = await Promise.all([
    readServerSecret(
      supabase,
      "xpay_webhook_secret_test",
      ["XPAY_WEBHOOK_SECRET_TEST", "XPAY_WEBHOOK_SECRET"],
      "whsec_"
    ),
    readServerSecret(
      supabase,
      "xpay_webhook_secret_live",
      ["XPAY_WEBHOOK_SECRET_LIVE", "XPAY_WEBHOOK_SECRET"],
      "whsec_"
    ),
  ]);
  return { test: testSecret, live: liveSecret };
}
