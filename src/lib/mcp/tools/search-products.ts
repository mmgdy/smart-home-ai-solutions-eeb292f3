import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the Baytzaki smart-home and art-furniture catalog. Returns matching products with name, price (EGP), brand, slug, and stock.",
  inputSchema: {
    query: z
      .string()
      .describe("Free-text query matched against product name, brand, and description. Use an empty string to list featured items.")
      .default(""),
    limit: z.number().int().min(1).max(30).default(10).describe("Max results (1-30)."),
    in_stock: z.boolean().default(true).describe("Only return products currently in stock."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit, in_stock }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("products")
      .select("id, name, slug, price, original_price, brand, stock, description, image_url")
      .limit(limit);
    if (in_stock) q = q.gt("stock", 0);
    const trimmed = query.trim();
    if (trimmed) {
      const safe = trimmed.replace(/[%,]/g, " ");
      q = q.or(
        `name.ilike.%${safe}%,brand.ilike.%${safe}%,description.ilike.%${safe}%`,
      );
    } else {
      q = q.order("created_at", { ascending: false });
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Search failed: ${error.message}` }], isError: true };
    }
    const items = (data ?? []).map((p) => ({
      name: p.name,
      slug: p.slug,
      price_egp: p.price,
      original_price_egp: p.original_price,
      brand: p.brand,
      stock: p.stock,
      url: `/products/${p.slug}`,
      image: p.image_url,
      description: p.description?.slice(0, 300) ?? null,
    }));
    return {
      content: [{ type: "text", text: `Found ${items.length} product(s).` }],
      structuredContent: { count: items.length, items },
    };
  },
});