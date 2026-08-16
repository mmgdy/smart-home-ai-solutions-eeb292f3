// Shared LLM gateway with provider fallbacks for Baytzaki edge functions.
//
// Pollinations (keyless) throttles datacenter egress IPs from time to time,
// so calls go through a fallback chain:
//   1. Pollinations `openai`   (identified via ?referrer=, their keyless tier)
//   2. Pollinations `openai-fast`
//   3. Hugging Face router     (only when HUGGINGFACE_API_KEY secret is set)
// Throws only when every provider fails.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const POLLINATIONS_REFERRER = "baytzaki.com";
const HUGGING_FACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

const extractContent = (text: string): string | null => {
  try {
    const content = JSON.parse(text)?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content : null;
  } catch {
    return null;
  }
};

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

async function tryHuggingFace(
  messages: ChatMessage[],
  maxTokens?: number,
): Promise<string | null> {
  const key = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!key) {
    lastOutcome.set("huggingface", "no-key");
    return null;
  }
  try {
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
  } catch (e) {
    console.warn("ai: huggingface threw:", e);
    lastOutcome.set("huggingface", "threw");
    return null;
  }
}

/** Chat completion with automatic provider fallback. Throws when all fail;
 *  the error message carries per-provider status codes for diagnosis. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const outcomes: string[] = [];
  const chain: Array<{ name: string; run: () => Promise<string | null> }> = [
    { name: "openai", run: () => tryPollinations("openai", messages, opts.maxTokens) },
    { name: "openai-fast", run: () => tryPollinations("openai-fast", messages, opts.maxTokens) },
    { name: "huggingface", run: () => tryHuggingFace(messages, opts.maxTokens) },
  ];
  for (const { name, run } of chain) {
    const text = await run();
    if (text) return text;
    outcomes.push(`${name}:${lastOutcome.get(name) ?? "err"}`);
  }
  throw new Error(`all AI providers failed [${outcomes.join(", ")}]`);
}

const lastOutcome = new Map<string, string>();

/** Raw chat-completions call with the same provider fallbacks. Use this for
 *  features that need tool/function calling or non-standard response fields;
 *  `body` is a standard OpenAI-style payload (model is set per provider).
 *  Returns the provider's parsed JSON. Throws when all providers fail. */
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

  const steps: Array<{ name: string; run: () => Promise<Record<string, any> | null> }> = [
    {
      name: "openai",
      run: () =>
        attempt(
          "openai",
          `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
          { ...payloadBase, model: "openai", stream: false },
          {},
        ),
    },
    {
      name: "openai-fast",
      run: () =>
        attempt(
          "openai-fast",
          `https://text.pollinations.ai/openai?referrer=${POLLINATIONS_REFERRER}`,
          { ...payloadBase, model: "openai-fast", stream: false },
          {},
        ),
    },
  ];

  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (hfKey) {
    steps.push({
      name: "huggingface",
      run: () =>
        attempt(
          "huggingface",
          "https://router.huggingface.co/v1/chat/completions",
          { ...payloadBase, model: HUGGING_FACE_MODEL, stream: false },
          { Authorization: `Bearer ${hfKey}` },
        ),
    });
  } else {
    lastOutcome.set("huggingface", "no-key");
  }

  for (const { name, run } of steps) {
    const parsed = await run();
    if (parsed) return parsed;
    outcomes.push(`${name}:${lastOutcome.get(name) ?? "err"}`);
  }
  throw new Error(`all AI providers failed [${outcomes.join(", ")}]`);
}
