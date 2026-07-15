import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List the Baytzaki product categories (lighting, security, climate, etc.) with their store URLs.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("categories")
      .select("name, slug, description")
      .order("name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const items = (data ?? []).map((c) => ({ ...c, url: `/products?category=${c.slug}` }));
    return {
      content: [{ type: "text", text: `${items.length} categories.` }],
      structuredContent: { count: items.length, items },
    };
  },
});