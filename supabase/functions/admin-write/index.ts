import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

const POLLINATIONS_TEXT_URL = "https://text.pollinations.ai/openai/v1/chat/completions";
const MODEL = "openai";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
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

async function generateSeoContentWithPollinations(contentType: string, topic: string, language: string): Promise<string> {
  const prompt = `Create ${contentType} for: ${topic}\n\nLanguage: ${language}\n\nRequirements:\n- SEO-friendly\n- Engaging and professional\n- Include relevant keywords\n- Appropriate length for the content type\n- Use proper formatting\n\nReturn only the content without any prefixes or explanations.`;

  const response = await fetch(POLLINATIONS_TEXT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
  });

  const raw = await response.text();
  let parsed: any = null;
  try { parsed = JSON.parse(raw); } catch {}

  if (!response.ok) {
    const detail = parsed?.error || raw.slice(0, 300);
    throw new Error(`Pollinations error (${response.status}): ${detail}`);
  }

  const content =
    typeof parsed?.choices?.[0]?.message?.content === "string"
      ? parsed.choices[0].message.content
      : "";

  if (!content) throw new Error("Empty response from Pollinations");
  return content;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 30 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "save-site-content") {
      const { content, section } = await req.json();
      if (!content || !section) {
        return new Response(JSON.stringify({ success: false, error: "content and section required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("site_info").upsert({
        section,
        key: "content",
        value: JSON.stringify(content),
        updated_at: new Date().toISOString(),
      }, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-seo") {
      const { topic, language = "en" } = await req.json();
      if (!topic) {
        return new Response(JSON.stringify({ success: false, error: "topic required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const seoContent = await generateSeoContentWithPollinations("SEO content", topic, language);
        return new Response(JSON.stringify({ success: true, content: seoContent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin write error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
