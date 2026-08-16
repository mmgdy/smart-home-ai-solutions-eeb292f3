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
      return null;
    }
    return extractContent(text);
  } catch (e) {
    console.warn(`ai: pollinations(${model}) threw:`, e);
    return null;
  }
}

async function tryHuggingFace(
  messages: ChatMessage[],
  maxTokens?: number,
): Promise<string | null> {
  const key = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!key) return null;
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
      return null;
    }
    return extractContent(text);
  } catch (e) {
    console.warn("ai: huggingface threw:", e);
    return null;
  }
}

/** Chat completion with automatic provider fallback. Throws when all fail. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const chain: Array<() => Promise<string | null>> = [
    () => tryPollinations("openai", messages, opts.maxTokens),
    () => tryPollinations("openai-fast", messages, opts.maxTokens),
    () => tryHuggingFace(messages, opts.maxTokens),
  ];
  for (const attempt of chain) {
    const text = await attempt();
    if (text) return text;
  }
  throw new Error("all AI providers failed");
}
