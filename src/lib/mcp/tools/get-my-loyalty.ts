import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_loyalty",
  title: "Get my loyalty balance",
  description: "Return the signed-in Baytzaki customer's loyalty points balance, lifetime points, and tier (bronze/silver/gold/platinum).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Sign in required." }], isError: true };
    }
    const email = ctx.getUserEmail();
    if (!email) {
      return { content: [{ type: "text", text: "No email on this account." }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("loyalty_points")
      .select("points_balance, lifetime_points, tier")
      .eq("email", email)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const result = data ?? { points_balance: 0, lifetime_points: 0, tier: "bronze" };
    return {
      content: [{ type: "text", text: `${result.points_balance} points (${result.tier}).` }],
      structuredContent: result,
    };
  },
});