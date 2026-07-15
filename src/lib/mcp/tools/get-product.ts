import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "get_product",
  title: "Get product details",
  description: "Look up one Baytzaki product by its slug. Returns full details, price in EGP, stock, and specifications.",
  inputSchema: {
    slug: z.string().min(1).describe("Product slug (e.g. 'aqara-hub-m2')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, price, original_price, brand, stock, description, image_url, images, protocol, specifications, tags")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No product with slug "${slug}".` }], isError: true };
    return {
      content: [{ type: "text", text: `${data.name} — EGP ${data.price}` }],
      structuredContent: { ...data, url: `/products/${data.slug}` },
    };
  },
});