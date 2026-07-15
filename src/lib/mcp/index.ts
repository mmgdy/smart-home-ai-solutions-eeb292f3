import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";
import listMyOrders from "./tools/list-my-orders";
import getMyLoyalty from "./tools/get-my-loyalty";

// Build the OAuth issuer from the project ref so it stays import-safe (no
// runtime env read) and matches the direct supabase.co discovery document.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "baytzaki-mcp",
  title: "Baytzaki",
  version: "0.1.0",
  instructions:
    "Tools for the Baytzaki Egyptian smart-home and art-furniture store. Use `search_products` and `get_product` to browse the catalog (prices in EGP), `list_categories` for sections, and `list_my_orders` / `get_my_loyalty` for the signed-in customer's own data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, getProduct, listCategories, listMyOrders, getMyLoyalty],
});