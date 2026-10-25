// Shared Omni-Router LLM & Vision Gateway for AzkaSmart Edge Functions.
//
// Features:
// 1. 100% Free-Model Omni-Routing across task types:
//    - "fast_chat"      : Sub-second bilingual (Arabic/English) chat & shopping assistance
//    - "reasoning_json" : High-accuracy structured JSON extraction, pricing & catalog enrichment
//    - "vision"         : Multimodal floor-plan analysis & visual product search
// 2. Multi-Provider Free Pools with automatic intra-provider model cascading:
//    - OmniRoute Gateway (self-hosted or cloud OpenAI-compatible router: auto/best-free)
//    - Groq Cloud Free LPU (llama-3.3-70b-versatile -> llama-3.1-8b-instant, llama-4-scout vision)
//    - Google Gemini Free Tier (gemini-2.0-flash -> gemini-1.5-flash)
//    - OpenRouter Free Omni-Array (models: [...:free] + openrouter/free auto-router)
//    - Hugging Face Free Inference Router (Qwen2.5-72B-Instruct / Llama-3.1-8B-Instruct)
//    - Pollinations Keyless Public Router (openai-fast -> openai, zero API key required)
// 3. Circuit Breaker & Rate-Limit Cooldowns:
//    - Providers returning 429/503/timeout are placed on a temporary cooldown so subsequent
//      requests skip rate-limited endpoints in 0ms.
// 4. Live Admin Settings Sync:
//    - Reads primary_provider, fallback_enabled, and custom free model overrides from `site_info`.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AITaskType = "fast_chat" | "reasoning_json" | "vision";

export interface ChatCompleteOptions {
  maxTokens?: number;
  temperature?: number;
  task?: AITaskType;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface VisionCompleteOptions {
  prompt: string;
  systemPrompt?: string;
  imageBase64: string;
  mimeType?: string;
  maxTokens?: number;
}

const POLLINATIONS_REFERRER = "azkasmart.com";

// Default Free Model Pools per Provider
const DEFAULT_OMNIROUTE_MODEL = "auto/best-free";
const DEFAULT_GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const DEFAULT_GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const DEFAULT_OPENROUTER_FAST_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openrouter/free",
];
const DEFAULT_OPENROUTER_REASONING_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];
const DEFAULT_OPENROUTER_VISION_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
];
const DEFAULT_HF_MODELS = [
  "Qwen/Qwen2.5-72B-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
];

// Enforce that OpenRouter models always stay on 100% free tiers unless explicitly overridden
function ensureFreeOpenRouterModel(model: string): string {
  const m = model.trim();
  if (!m) return "openrouter/free";
  if (m === "openrouter/free" || m.endsWith(":free")) return m;
  return `${m}:free`;
}

// ─── Circuit Breaker & Outcome State ─────────────────────────────────────────
const providerCooldownUntil = new Map<string, number>();
const lastOutcome = new Map<string, string>();
let lastSuccessfulProvider = "none";

function isProviderOnCooldown(provider: string): boolean {
  const until = providerCooldownUntil.get(provider);
  if (!until) return false;
  if (Date.now() >= until) {
    providerCooldownUntil.delete(provider);
    return false;
  }
  return true;
}

function markProviderFailure(provider: string, status: number | string) {
  lastOutcome.set(provider, String(status));
  const code = Number(status);
  if (code === 429 || code === 503 || status === "timeout") {
    // 45-second cooldown on rate limits or transient overload
    providerCooldownUntil.set(provider, Date.now() + 45_000);
  } else if (code === 401 || code === 402 || code === 403) {
    // 3-minute cooldown on invalid key or exhausted quota
    providerCooldownUntil.set(provider, Date.now() + 180_000);
  }
}

function markProviderSuccess(provider: string) {
  providerCooldownUntil.delete(provider);
  lastOutcome.set(provider, "ok");
  lastSuccessfulProvider = provider;
}

export function getLastSuccessfulProvider(): string {
  return lastSuccessfulProvider;
}

// ─── HTTP Helper with Per-Request Timeout ────────────────────────────────────
async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 6000,
): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text };
  } catch (e: any) {
    const isTimeout = e?.name === "TimeoutError" || e?.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? 408 : 0,
      text: isTimeout ? "timeout" : String(e?.message || e),
    };
  }
}

const extractContent = (text: string): string | null => {
  try {
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      const trimmed = content.trim();
      const lower = trimmed.toLowerCase();
      // Filter out known proxy error/quota banners disguised as 200 OK
      if (
        lower.includes("doesn't have enough credits") ||
        lower.includes("top up") ||
        lower.includes("complete a quest") ||
        lower.includes("pollinations.ai") ||
        lower.includes("insufficient balance") ||
        lower.includes("rate limit exceeded")
      ) {
        return null;
      }
      return trimmed;
    }
    // Google Gemini native format fallback
    const geminiText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof geminiText === "string" && geminiText.trim()) return geminiText.trim();
    return null;
  } catch {
    return null;
  }
};

// ─── Batched Configuration & Key Loader (60s TTL Cache) ──────────────────────
interface AIConfigMap {
  omniroute_base_url: string;
  omniroute_api_key: string;
  omniroute_model: string;
  gemini_api_key: string;
  gemini_model: string;
  groq_api_key: string;
  groq_model: string;
  openrouter_api_key: string;
  openrouter_model: string;
  huggingface_api_key: string;
  huggingface_model: string;
  primary_provider: string;
  fallback_enabled: boolean;
}

let cachedConfig: { data: AIConfigMap; exp: number } | null = null;

function getEnv(name: string): string {
  try {
    if (typeof Deno !== "undefined" && Deno.env) {
      return (Deno.env.get(name) || "").trim();
    }
  } catch {}
  return "";
}

async function loadAIConfig(): Promise<AIConfigMap> {
  if (cachedConfig && cachedConfig.exp > Date.now()) {
    return cachedConfig.data;
  }

  const dbMap: Record<string, string> = {};
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");
    if (supabaseUrl && serviceKey) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.89.0");
      const client = createClient(supabaseUrl, serviceKey);
      const { data } = await client
        .from("site_info")
        .select("key, value")
        .eq("section", "ai");
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row?.key && typeof row.value === "string") {
            dbMap[row.key] = row.value.trim();
          }
        }
      }
    }
  } catch {}

  const cfg: AIConfigMap = {
    omniroute_base_url: getEnv("OMNIROUTE_BASE_URL") || dbMap["omniroute_base_url"] || "",
    omniroute_api_key: getEnv("OMNIROUTE_API_KEY") || dbMap["omniroute_api_key"] || "",
    omniroute_model: getEnv("OMNIROUTE_MODEL") || dbMap["omniroute_model"] || DEFAULT_OMNIROUTE_MODEL,
    gemini_api_key: getEnv("GEMINI_API_KEY") || dbMap["gemini_api_key"] || "",
    gemini_model: dbMap["gemini_model"] || DEFAULT_GEMINI_MODELS[0],
    groq_api_key: getEnv("GROQ_API_KEY") || dbMap["groq_api_key"] || "",
    groq_model: dbMap["groq_model"] || DEFAULT_GROQ_MODELS[0],
    openrouter_api_key: getEnv("OPENROUTER_API_KEY") || dbMap["openrouter_api_key"] || "",
    openrouter_model: dbMap["openrouter_model"] || DEFAULT_OPENROUTER_FAST_MODELS[0],
    huggingface_api_key: getEnv("HUGGINGFACE_API_KEY") || dbMap["huggingface_api_key"] || "",
    huggingface_model: dbMap["huggingface_model"] || DEFAULT_HF_MODELS[0],
    primary_provider: dbMap["primary_provider"] || "omni",
    fallback_enabled: dbMap["fallback_enabled"] !== "false",
  };

  cachedConfig = { data: cfg, exp: Date.now() + 60_000 };
  return cfg;
}

// ─── Individual Free Provider Adapters ──────────────────────────────────────

async function tryOmniRoute(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  if (isProviderOnCooldown("omniroute")) return null;
  const baseUrl = cfg.omniroute_base_url.replace(/\/+$/, "");
  if (!baseUrl) {
    lastOutcome.set("omniroute", "no-url");
    return null;
  }

  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : baseUrl.endsWith("/v1")
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {};
  if (cfg.omniroute_api_key) {
    headers.Authorization = `Bearer ${cfg.omniroute_api_key}`;
  }

  const { ok, status, text } = await postJson(
    endpoint,
    {
      model: cfg.omniroute_model || DEFAULT_OMNIROUTE_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.25,
      stream: false,
    },
    headers,
    opts.timeoutMs ?? 5500,
  );

  if (!ok) {
    console.warn(`ai: omniroute ${status}: ${text.slice(0, 160)}`);
    markProviderFailure("omniroute", status === 408 ? "timeout" : status);
    return null;
  }
  const content = extractContent(text);
  if (!content) {
    lastOutcome.set("omniroute", "empty");
    return null;
  }
  markProviderSuccess("omniroute");
  return content;
}

async function tryGroq(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  if (isProviderOnCooldown("groq")) return null;
  if (!cfg.groq_api_key) {
    lastOutcome.set("groq", "no-key");
    return null;
  }

  const models = Array.from(new Set([cfg.groq_model, ...DEFAULT_GROQ_MODELS])).filter(Boolean);

  for (const model of models) {
    const { ok, status, text } = await postJson(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model,
        messages,
        max_tokens: opts.maxTokens ?? 500,
        temperature: opts.temperature ?? 0.25,
        stream: false,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      },
      { Authorization: `Bearer ${cfg.groq_api_key}` },
      opts.timeoutMs ?? 5000,
    );

    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess(`groq:${model}`);
        return content;
      }
    } else {
      console.warn(`ai: groq(${model}) ${status}: ${text.slice(0, 140)}`);
      // If auth error, don't bother trying second model on same key
      if (status === 401 || status === 403) {
        markProviderFailure("groq", status);
        return null;
      }
    }
  }

  markProviderFailure("groq", 429);
  return null;
}

async function tryGemini(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  if (isProviderOnCooldown("gemini")) return null;
  if (!cfg.gemini_api_key) {
    lastOutcome.set("gemini", "no-key");
    return null;
  }

  const models = Array.from(new Set([cfg.gemini_model, ...DEFAULT_GEMINI_MODELS])).filter(Boolean);

  for (const model of models) {
    const { ok, status, text } = await postJson(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        model,
        messages,
        max_tokens: opts.maxTokens ?? 500,
        temperature: opts.temperature ?? 0.25,
        stream: false,
      },
      { Authorization: `Bearer ${cfg.gemini_api_key}` },
      opts.timeoutMs ?? 6000,
    );

    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess(`gemini:${model}`);
        return content;
      }
    } else {
      console.warn(`ai: gemini(${model}) ${status}: ${text.slice(0, 140)}`);
      if (status === 400 || status === 401 || status === 403) {
        markProviderFailure("gemini", status);
        return null;
      }
    }
  }

  markProviderFailure("gemini", 429);
  return null;
}

async function tryOpenRouter(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  if (isProviderOnCooldown("openrouter")) return null;
  if (!cfg.openrouter_api_key) {
    lastOutcome.set("openrouter", "no-key");
    return null;
  }

  const preferred = ensureFreeOpenRouterModel(cfg.openrouter_model);
  const basePool =
    opts.task === "reasoning_json"
      ? DEFAULT_OPENROUTER_REASONING_MODELS
      : DEFAULT_OPENROUTER_FAST_MODELS;

  // OpenRouter's native `models` parameter accepts up to 3 models for automatic server-side failover
  const freeModelsPool = Array.from(new Set([preferred, ...basePool])).slice(0, 3);

  const { ok, status, text } = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: freeModelsPool[0],
      models: freeModelsPool,
      route: "fallback",
      messages,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.25,
      stream: false,
    },
    {
      Authorization: `Bearer ${cfg.openrouter_api_key}`,
      "HTTP-Referer": "https://azkasmart.com",
      "X-Title": "AzkaSmart",
    },
    opts.timeoutMs ?? 6500,
  );

  if (ok) {
    const content = extractContent(text);
    if (content) {
      markProviderSuccess(`openrouter:${freeModelsPool[0]}`);
      return content;
    }
  } else {
    console.warn(`ai: openrouter pool ${status}: ${text.slice(0, 140)}`);
  }

  // Secondary fallback: OpenRouter's built-in `openrouter/free` omni-router
  const { ok: ok2, status: status2, text: text2 } = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openrouter/free",
      messages,
      max_tokens: opts.maxTokens ?? 500,
      stream: false,
    },
    {
      Authorization: `Bearer ${cfg.openrouter_api_key}`,
      "HTTP-Referer": "https://azkasmart.com",
      "X-Title": "AzkaSmart",
    },
    opts.timeoutMs ?? 6500,
  );

  if (ok2) {
    const content2 = extractContent(text2);
    if (content2) {
      markProviderSuccess("openrouter:openrouter/free");
      return content2;
    }
  }

  markProviderFailure("openrouter", status2 || status);
  return null;
}

async function tryHuggingFace(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  if (isProviderOnCooldown("huggingface")) return null;
  if (!cfg.huggingface_api_key) {
    lastOutcome.set("huggingface", "no-key");
    return null;
  }

  const models = Array.from(new Set([cfg.huggingface_model, ...DEFAULT_HF_MODELS])).filter(Boolean);

  for (const model of models) {
    const { ok, status, text } = await postJson(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model,
        messages,
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.2,
        stream: false,
      },
      { Authorization: `Bearer ${cfg.huggingface_api_key}` },
      opts.timeoutMs ?? 6000,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess(`huggingface:${model}`);
        return content;
      }
    } else {
      console.warn(`ai: huggingface(${model}) ${status}: ${text.slice(0, 140)}`);
      if (status === 401 || status === 403) {
        markProviderFailure("huggingface", status);
        return null;
      }
    }
  }

  markProviderFailure("huggingface", 429);
  return null;
}

async function tryPollinations(
  model: string,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Promise<string | null> {
  const providerKey = `pollinations-${model}`;
  const timeoutMs = Math.max(opts.timeoutMs ?? 11000, 10500);
  try {
    // Note: Pollinations `openai-fast` (GPT-OSS 20B) is a reasoning model where `max_tokens`
    // includes chain-of-thought reasoning tokens. Passing `reasoning_effort: "low"` and avoiding
    // a small max_tokens cap prevents reasoning from starving `message.content`.
    const { ok, status, text } = await postJson(
      `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
      {
        model,
        reasoning_effort: "low",
        messages,
        temperature: opts.temperature ?? 0.25,
        stream: false,
      },
      {},
      timeoutMs,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess(providerKey);
        return content;
      }
    } else {
      console.warn(`ai: pollinations(${model}) ${status}: ${text.slice(0, 140)}`);
    }

    // If anonymous concurrent rate-limit (402/429) hit, wait briefly and retry via root endpoint
    if (status === 402 || status === 429 || status === 503) {
      await new Promise((r) => setTimeout(r, 1100));
      const retry = await postJson(
        "https://text.pollinations.ai/",
        {
          model: "openai-fast",
          reasoning_effort: "low",
          messages,
          seed: Math.floor(Math.random() * 100000),
        },
        {},
        timeoutMs,
      );
      if (retry.ok && retry.text.trim()) {
        const parsedJson = extractContent(retry.text);
        if (parsedJson) {
          markProviderSuccess(`${providerKey}-retry`);
          return parsedJson;
        }
        const raw = retry.text.trim();
        const lower = raw.toLowerCase();
        if (
          !raw.startsWith("{") &&
          !raw.startsWith("<!doctype") &&
          !lower.includes("doesn't have enough credits") &&
          !lower.includes("rate limit") &&
          !lower.includes("bad gateway")
        ) {
          markProviderSuccess(`${providerKey}-text`);
          return raw;
        }
      }
    }

    lastOutcome.set(providerKey, String(status || "empty"));
    return null;
  } catch (e) {
    console.warn(`ai: pollinations(${model}) threw:`, e);
    lastOutcome.set(providerKey, "threw");
    return null;
  }
}

export function hasConfiguredAIKey(): boolean {
  return !!(
    getEnv("OMNIROUTE_BASE_URL") ||
    getEnv("GEMINI_API_KEY") ||
    getEnv("GROQ_API_KEY") ||
    getEnv("OPENROUTER_API_KEY") ||
    getEnv("HUGGINGFACE_API_KEY")
  );
}

/** Build task-aware Omni-Router execution order using only free models. */
function buildOmniChain(
  cfg: AIConfigMap,
  messages: ChatMessage[],
  opts: ChatCompleteOptions,
): Array<{ name: string; run: () => Promise<string | null> }> {
  const task = opts.task ?? "fast_chat";

  const adapters: Record<string, { name: string; run: () => Promise<string | null> }> = {
    omniroute: { name: "omniroute", run: () => tryOmniRoute(cfg, messages, opts) },
    groq: { name: "groq", run: () => tryGroq(cfg, messages, opts) },
    gemini: { name: "gemini", run: () => tryGemini(cfg, messages, opts) },
    openrouter: { name: "openrouter", run: () => tryOpenRouter(cfg, messages, opts) },
    huggingface: { name: "huggingface", run: () => tryHuggingFace(cfg, messages, opts) },
    "pollinations-fast": {
      name: "pollinations-fast",
      run: () => tryPollinations("openai-fast", messages, opts),
    },
    pollinations: {
      name: "pollinations",
      run: () => tryPollinations("openai", messages, opts),
    },
  };

  // Task-optimized default order:
  // - fast_chat: OmniRoute -> Groq LPU (<300ms) -> Gemini Flash -> OpenRouter Free Pool -> HF -> Pollinations
  // - reasoning_json: OmniRoute -> Gemini Flash (large context) -> Groq 70B -> OpenRouter DeepSeek/Qwen Free -> HF -> Pollinations
  let order =
    task === "reasoning_json"
      ? ["omniroute", "gemini", "groq", "openrouter", "huggingface", "pollinations-fast"]
      : ["omniroute", "groq", "gemini", "openrouter", "huggingface", "pollinations-fast"];

  // Honor explicit primary_provider if set to a specific provider in Admin UI (and not "omni")
  if (cfg.primary_provider && cfg.primary_provider !== "omni" && adapters[cfg.primary_provider]) {
    order = [
      cfg.primary_provider,
      ...order.filter((p) => p !== cfg.primary_provider),
    ];
  }

  // If fallback is disabled in Admin UI, only run primary + keyless safety net
  if (!cfg.fallback_enabled && cfg.primary_provider && adapters[cfg.primary_provider]) {
    return [adapters[cfg.primary_provider], adapters["pollinations-fast"]];
  }

  return order.map((key) => adapters[key]).filter(Boolean);
}

/** Chat completion with task-aware Free Omni-Routing, prompt sanitization, and circuit-breaker failover. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatCompleteOptions = {},
): Promise<string> {
  const sanitizedMessages = messages.map((m) => {
    if (m.role !== "user") return m;
    let content = m.content;
    content = content.replace(/ignore (all )?(previous|above) (instructions|rules)/gi, "[redacted]");
    content = content.replace(/reveal (the )?(system prompt|api key|database|cost price)/gi, "[redacted]");
    content = content.replace(/disregard (system|prior) constraints/gi, "[redacted]");
    return { ...m, content };
  });

  const cfg = await loadAIConfig();
  const chain = buildOmniChain(cfg, sanitizedMessages, opts);
  const outcomes: string[] = [];
  const startTime = Date.now();

  for (const { name, run } of chain) {
    const text = await run();
    if (text) {
      const elapsed = Date.now() - startTime;
      console.log(
        `[Omni-Router] Success via '${lastSuccessfulProvider || name}' (task=${opts.task ?? "fast_chat"}) in ${elapsed}ms (${text.length} chars)`,
      );
      return text;
    }
    outcomes.push(`${name}:${lastOutcome.get(name) ?? "skip"}`);
  }
  throw new Error(`all AI providers failed [${outcomes.join(", ")}]`);
}

/** Multimodal Vision Omni-Router using 100% Free Vision Models (OmniRoute -> Gemini Free -> Groq Llama-4 Vision -> OpenRouter Free Vision -> Pollinations Vision). */
export async function visionComplete(
  opts: VisionCompleteOptions,
): Promise<{ text: string; provider: string }> {
  const cfg = await loadAIConfig();
  const mimeType = opts.mimeType || "image/jpeg";
  const dataUrl = opts.imageBase64.startsWith("data:")
    ? opts.imageBase64
    : `data:${mimeType};base64,${opts.imageBase64}`;
  const rawBase64 = opts.imageBase64.replace(/^data:[^;]+;base64,/, "");

  const openAiVisionMessages = [
    ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
    {
      role: "user",
      content: [
        { type: "text", text: opts.prompt },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];

  // 1. OmniRoute Vision (if configured)
  if (cfg.omniroute_base_url && !isProviderOnCooldown("omniroute-vision")) {
    const baseUrl = cfg.omniroute_base_url.replace(/\/+$/, "");
    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : baseUrl.endsWith("/v1")
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {};
    if (cfg.omniroute_api_key) headers.Authorization = `Bearer ${cfg.omniroute_api_key}`;

    const { ok, status, text } = await postJson(
      endpoint,
      {
        model: cfg.omniroute_model || DEFAULT_OMNIROUTE_MODEL,
        messages: openAiVisionMessages,
        max_tokens: opts.maxTokens ?? 700,
      },
      headers,
      9000,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess("omniroute-vision");
        return { text: content, provider: "omniroute-vision" };
      }
    } else {
      markProviderFailure("omniroute-vision", status);
    }
  }

  // 2. Google Gemini Free Vision (Native generateContent endpoint)
  if (cfg.gemini_api_key && !isProviderOnCooldown("gemini-vision")) {
    const geminiModels = Array.from(new Set([cfg.gemini_model, "gemini-2.0-flash", "gemini-1.5-flash"]));
    for (const model of geminiModels) {
      const { ok, status, text } = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.gemini_api_key}`,
        {
          contents: [
            {
              parts: [
                { text: opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.prompt}` : opts.prompt },
                { inline_data: { mime_type: mimeType, data: rawBase64 } },
              ],
            },
          ],
        },
        {},
        9000,
      );
      if (ok) {
        const content = extractContent(text);
        if (content) {
          markProviderSuccess(`gemini-vision:${model}`);
          return { text: content, provider: `gemini:${model}` };
        }
      } else if (status === 401 || status === 403) {
        markProviderFailure("gemini-vision", status);
        break;
      }
    }
  }

  // 3. Groq Free Vision (Llama 4 Scout 17B Vision on LPU)
  if (cfg.groq_api_key && !isProviderOnCooldown("groq-vision")) {
    const { ok, status, text } = await postJson(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: DEFAULT_GROQ_VISION_MODEL,
        messages: openAiVisionMessages,
        max_tokens: opts.maxTokens ?? 700,
        temperature: 0.2,
      },
      { Authorization: `Bearer ${cfg.groq_api_key}` },
      8500,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess("groq-vision");
        return { text: content, provider: `groq:${DEFAULT_GROQ_VISION_MODEL}` };
      }
    } else {
      markProviderFailure("groq-vision", status);
    }
  }

  // 4. OpenRouter Free Vision Pool (Gemini 2.0 Flash Free / Qwen 2.5 VL 72B Free / Llama 3.2 11B Vision Free)
  if (cfg.openrouter_api_key && !isProviderOnCooldown("openrouter-vision")) {
    const { ok, status, text } = await postJson(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: DEFAULT_OPENROUTER_VISION_MODELS[0],
        models: DEFAULT_OPENROUTER_VISION_MODELS,
        route: "fallback",
        messages: openAiVisionMessages,
        max_tokens: opts.maxTokens ?? 700,
      },
      {
        Authorization: `Bearer ${cfg.openrouter_api_key}`,
        "HTTP-Referer": "https://azkasmart.com",
        "X-Title": "AzkaSmart",
      },
      9500,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess("openrouter-vision");
        return { text: content, provider: "openrouter:vision-free" };
      }
    } else {
      markProviderFailure("openrouter-vision", status);
    }
  }

  // 5. Pollinations Keyless Vision Fallback
  if (!isProviderOnCooldown("pollinations-vision")) {
    const { ok, status, text } = await postJson(
      `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
      {
        model: "openai",
        messages: openAiVisionMessages,
        max_tokens: opts.maxTokens ?? 600,
      },
      {},
      9500,
    );
    if (ok) {
      const content = extractContent(text);
      if (content) {
        markProviderSuccess("pollinations-vision");
        return { text: content, provider: "pollinations:vision" };
      }
    } else {
      markProviderFailure("pollinations-vision", status);
    }
  }

  throw new Error("All free vision providers failed");
}

/** Raw chat-completions call (for OpenAI tool-calling & structured extraction) with Free Omni-Router fallbacks. */
export async function chatCompleteRaw(
  body: Record<string, unknown>,
): Promise<Record<string, any>> {
  const cfg = await loadAIConfig();

  const attempt = async (
    name: string,
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<Record<string, any> | null> => {
    if (isProviderOnCooldown(name)) return null;
    try {
      const { ok, status, text } = await postJson(url, payload, headers, 8000);
      if (!ok) {
        console.warn(`ai(${name}) ${status}: ${text.slice(0, 160)}`);
        markProviderFailure(name, status === 408 ? "timeout" : status);
        return null;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && (parsed.choices || parsed.candidates)) {
          markProviderSuccess(name);
          return parsed;
        }
      } catch {
        /* fall through */
      }
      lastOutcome.set(name, "unparseable");
      return null;
    } catch (e) {
      console.warn(`ai(${name}) threw:`, e);
      lastOutcome.set(name, "threw");
      return null;
    }
  };

  const payloadBase: Record<string, unknown> = { ...body };
  delete payloadBase.model;
  const outcomes: string[] = [];

  const steps: Array<{ name: string; run: () => Promise<Record<string, any> | null> }> = [];

  if (cfg.omniroute_base_url) {
    const baseUrl = cfg.omniroute_base_url.replace(/\/+$/, "");
    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : baseUrl.endsWith("/v1")
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {};
    if (cfg.omniroute_api_key) headers.Authorization = `Bearer ${cfg.omniroute_api_key}`;
    steps.push({
      name: "omniroute",
      run: () =>
        attempt(
          "omniroute",
          endpoint,
          { ...payloadBase, model: cfg.omniroute_model || DEFAULT_OMNIROUTE_MODEL },
          headers,
        ),
    });
  }

  if (cfg.groq_api_key) {
    steps.push({
      name: "groq",
      run: () =>
        attempt(
          "groq",
          "https://api.groq.com/openai/v1/chat/completions",
          { ...payloadBase, model: cfg.groq_model || DEFAULT_GROQ_MODELS[0] },
          { Authorization: `Bearer ${cfg.groq_api_key}` },
        ),
    });
  } else {
    lastOutcome.set("groq", "no-key");
  }

  if (cfg.gemini_api_key) {
    steps.push({
      name: "gemini",
      run: () =>
        attempt(
          "gemini",
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          { ...payloadBase, model: cfg.gemini_model || DEFAULT_GEMINI_MODELS[0] },
          { Authorization: `Bearer ${cfg.gemini_api_key}` },
        ),
    });
  } else {
    lastOutcome.set("gemini", "no-key");
  }

  if (cfg.openrouter_api_key) {
    const freeModels = Array.from(
      new Set([
        ensureFreeOpenRouterModel(cfg.openrouter_model),
        ...DEFAULT_OPENROUTER_REASONING_MODELS,
      ]),
    ).slice(0, 3);
    steps.push({
      name: "openrouter",
      run: () =>
        attempt(
          "openrouter",
          "https://openrouter.ai/api/v1/chat/completions",
          { ...payloadBase, model: freeModels[0], models: freeModels, route: "fallback" },
          {
            Authorization: `Bearer ${cfg.openrouter_api_key}`,
            "HTTP-Referer": "https://azkasmart.com",
            "X-Title": "AzkaSmart",
          },
        ),
    });
  } else {
    lastOutcome.set("openrouter", "no-key");
  }

  if (cfg.huggingface_api_key) {
    steps.push({
      name: "huggingface",
      run: () =>
        attempt(
          "huggingface",
          "https://router.huggingface.co/v1/chat/completions",
          { ...payloadBase, model: cfg.huggingface_model || DEFAULT_HF_MODELS[0] },
          { Authorization: `Bearer ${cfg.huggingface_api_key}` },
        ),
    });
  } else {
    lastOutcome.set("huggingface", "no-key");
  }

  steps.push({
    name: "openai-fast",
    run: () =>
      attempt(
        "openai-fast",
        `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
        { ...payloadBase, model: "openai-fast" },
        {},
      ),
  });

  for (const { name, run } of steps) {
    const parsed = await run();
    if (parsed) return parsed;
    outcomes.push(`${name}:${lastOutcome.get(name) ?? "err"}`);
  }
  throw new Error(`all AI providers failed [${outcomes.join(", ")}]`);
}
