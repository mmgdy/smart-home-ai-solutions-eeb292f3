// Shared LLM gateway with provider fallbacks for AzkaSmart edge functions.
//
// Providers supported (in priority order):
//   1. Google Gemini (GEMINI_API_KEY) via OpenAI-compatible endpoint
//   2. Groq (GROQ_API_KEY) via OpenAI-compatible endpoint
//   3. OpenRouter (OPENROUTER_API_KEY)
//   4. Hugging Face router (HUGGINGFACE_API_KEY)
//   5. Pollinations fallback
// Throws only when every provider fails.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const POLLINATIONS_REFERRER = "azkasmart.com";
const HUGGING_FACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-flash-latest";

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text };
  } catch (e: any) {
    return { ok: false, status: 0, text: String(e?.message || e) };
  }
}

const extractContent = (text: string): string | null => {
  try {
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content.trim();
    // Google Gemini native format fallback
    const geminiText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof geminiText === "string" && geminiText.trim()) return geminiText.trim();
    return null;
  } catch {
    return null;
  }
};

async function tryGemini(messages: ChatMessage[], maxTokens?: number): Promise<string | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    lastOutcome.set("gemini", "no-key");
    return null;
  }
  const { ok, status, text } = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      model: GEMINI_MODEL,
      messages,
      max_tokens: maxTokens ?? 500,
      temperature: 0.3,
      stream: false,
    },
    { Authorization: `Bearer ${key}` },
  );
  if (!ok) {
    console.warn(`ai: gemini ${status}: ${text.slice(0, 160)}`);
    lastOutcome.set("gemini", String(status));
    return null;
  }
  const content = extractContent(text);
  if (!content) lastOutcome.set("gemini", "empty");
  return content;
}

async function tryGroq(messages: ChatMessage[], maxTokens?: number): Promise<string | null> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) {
    lastOutcome.set("groq", "no-key");
    return null;
  }
  const { ok, status, text } = await postJson(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens ?? 500,
      temperature: 0.3,
      stream: false,
    },
    { Authorization: `Bearer ${key}` },
  );
  if (!ok) {
    console.warn(`ai: groq ${status}: ${text.slice(0, 160)}`);
    lastOutcome.set("groq", String(status));
    return null;
  }
  const content = extractContent(text);
  if (!content) lastOutcome.set("groq", "empty");
  return content;
}

async function tryOpenRouter(messages: ChatMessage[], maxTokens?: number): Promise<string | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) {
    lastOutcome.set("openrouter", "no-key");
    return null;
  }
  const { ok, status, text } = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "google/gemini-2.0-flash-exp:free",
      messages,
      max_tokens: maxTokens ?? 500,
      stream: false,
    },
    {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://azkasmart.com",
      "X-Title": "AzkaSmart",
    },
  );
  if (!ok) {
    console.warn(`ai: openrouter ${status}: ${text.slice(0, 160)}`);
    lastOutcome.set("openrouter", String(status));
    return null;
  }
  const content = extractContent(text);
  if (!content) lastOutcome.set("openrouter", "empty");
  return content;
}

async function tryHuggingFace(messages: ChatMessage[], maxTokens?: number): Promise<string | null> {
  const key = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!key) {
    lastOutcome.set("huggingface", "no-key");
    return null;
  }
  const { ok, status, text } = await postJson(
    "https://router.huggingface.co/v1/chat/completions",
    {
      model: HUGGING_FACE_MODEL,
      messages,
      max_tokens: maxTokens ?? 220,
      temperature: 0.2,
      stream: false,
    },
    { Authorization: `Bearer ${key}` },
  );
  if (!ok) {
    console.warn(`ai: huggingface ${status}: ${text.slice(0, 160)}`);
    lastOutcome.set("huggingface", String(status));
    return null;
  }
  const content = extractContent(text);
  if (!content) lastOutcome.set("huggingface", "empty");
  return content;
}

async function tryPollinations(
  model: string,
  messages: ChatMessage[],
  maxTokens?: number,
): Promise<string | null> {
  try {
    const { ok, status, text } = await postJson(
      `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
      {
        model,
        messages,
        stream: false,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      },
    );
    if (!ok) {
      console.warn(`ai: pollinations(${model}) ${status}: ${text.slice(0, 160)}`);
      lastOutcome.set(model, String(status));
      return null;
    }
    const content = extractContent(text);
    if (!content) lastOutcome.set(model, "empty");
    return content;
  } catch (e) {
    console.warn(`ai: pollinations(${model}) threw:`, e);
    lastOutcome.set(model, "threw");
    return null;
  }
}

const lastOutcome = new Map<string, string>();

export function hasConfiguredAIKey(): boolean {
  return !!(
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("GROQ_API_KEY") ||
    Deno.env.get("OPENROUTER_API_KEY") ||
    Deno.env.get("HUGGINGFACE_API_KEY")
  );
}

/** Chat completion with automatic provider fallback. Throws when all fail;
 *  the error message carries per-provider status codes for diagnosis. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const outcomes: string[] = [];
  const chain: Array<{ name: string; run: () => Promise<string | null> }> = [
    { name: "gemini", run: () => tryGemini(messages, opts.maxTokens) },
    { name: "groq", run: () => tryGroq(messages, opts.maxTokens) },
    { name: "openrouter", run: () => tryOpenRouter(messages, opts.maxTokens) },
    { name: "huggingface", run: () => tryHuggingFace(messages, opts.maxTokens) },
    { name: "pollinations-fast", run: () => tryPollinations("openai-fast", messages, opts.maxTokens) },
    { name: "pollinations", run: () => tryPollinations("openai", messages, opts.maxTokens) },
  ];
  for (const { name, run } of chain) {
    const text = await run();
    if (text) return text;
    outcomes.push(`${name}:${lastOutcome.get(name) ?? "err"}`);
  }
  throw new Error(`all AI providers failed [${outcomes.join(", ")}]`);
}

/** Raw chat-completions call with the same provider fallbacks. */
export async function chatCompleteRaw(
  body: Record<string, unknown>,
): Promise<Record<string, any>> {
  const attempt = async (
    name: string,
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<Record<string, any> | null> => {
    try {
      const { ok, status, text } = await postJson(url, payload, headers);
      if (!ok) {
        console.warn(`ai(${name}) ${status}: ${text.slice(0, 160)}`);
        lastOutcome.set(name, String(status));
        return null;
      }
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") return parsed;
      } catch { /* fall through */ }
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

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    steps.push({
      name: "gemini",
      run: () =>
        attempt(
          "gemini",
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          { ...payloadBase, model: GEMINI_MODEL },
          { Authorization: `Bearer ${geminiKey}` },
        ),
    });
  } else {
    lastOutcome.set("gemini", "no-key");
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    steps.push({
      name: "groq",
      run: () =>
        attempt(
          "groq",
          "https://api.groq.com/openai/v1/chat/completions",
          { ...payloadBase, model: GROQ_MODEL },
          { Authorization: `Bearer ${groqKey}` },
        ),
    });
  } else {
    lastOutcome.set("groq", "no-key");
  }

  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (hfKey) {
    steps.push({
      name: "huggingface",
      run: () =>
        attempt(
          "huggingface",
          "https://router.huggingface.co/v1/chat/completions",
          { ...payloadBase, model: HUGGING_FACE_MODEL },
          { Authorization: `Bearer ${hfKey}` },
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
