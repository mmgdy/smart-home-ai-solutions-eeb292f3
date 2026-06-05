// Returns the public Firebase Web config + VAPID key so the client can
// initialize the messaging service worker without exposing config in the repo.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cfg = {
    apiKey: Deno.env.get("FIREBASE_API_KEY") ?? "",
    authDomain: Deno.env.get("FIREBASE_AUTH_DOMAIN") ?? "",
    projectId: Deno.env.get("FIREBASE_PROJECT_ID") ?? "",
    messagingSenderId: Deno.env.get("FIREBASE_MESSAGING_SENDER_ID") ?? "",
    appId: Deno.env.get("FIREBASE_APP_ID") ?? "",
  };
  const vapidKey = Deno.env.get("FIREBASE_VAPID_KEY") ?? "";

  if (!cfg.apiKey || !cfg.projectId || !vapidKey) {
    return new Response(
      JSON.stringify({ error: "Firebase not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ config: cfg, vapidKey }),
    { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } },
  );
});