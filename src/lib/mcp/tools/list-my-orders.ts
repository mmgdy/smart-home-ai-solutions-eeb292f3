import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description: "List the signed-in Baytzaki customer's orders (id, total EGP, status, date).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Sign in required." }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("orders")
      .select("id, total, status, email, created_at, shipping_address")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} order(s).` }],
      structuredContent: { count: data?.length ?? 0, orders: data ?? [] },
    };
  },
});