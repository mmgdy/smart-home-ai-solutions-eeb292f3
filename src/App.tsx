import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import AIConsultant from "./pages/AIConsultant";
import Services from "./pages/Services";
import Loyalty from "./pages/Loyalty";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Calculator from "./pages/Calculator";
import Profile from "./pages/Profile";
import Legal from "./pages/Legal";
import Bundles from "./pages/Bundles";
import About from "./pages/About";
import Brands from "./pages/Brands";
import HomeDesigner from "./pages/HomeDesigner";
import AppSimulator from "./pages/AppSimulator";
import Login from "./pages/Login";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

// Reads favicon_url / app_icon_url from admin_settings and applies them to the
// document head + dynamic web app manifest.
export function FaviconUpdater() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['favicon_url', 'app_icon_url', 'logo_url']);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });

      // Favicon
      if (map.favicon_url) {
        let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = map.favicon_url;
      }

      // Apple touch icon (iOS home screen)
      if (map.app_icon_url) {
        let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
        if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple); }
        apple.href = map.app_icon_url;
      }

      // PWA manifest icons (update manifest.json at runtime)
      if (map.logo_url || map.app_icon_url) {
        try {
          const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
          if (manifestLink) {
            const resp = await fetch(manifestLink.href);
            const manifest = await resp.json();
            if (map.logo_url) manifest.short_name = "AzkaSmart";
            if (map.app_icon_url) {
              manifest.icons = [
                { src: map.app_icon_url, sizes: "512x512", type: "image/png", purpose: "any" },
                { src: map.app_icon_url, sizes: "512x512", type: "image/png", purpose: "maskable" },
              ];
            }
            const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
            const blobUrl = URL.createObjectURL(blob);
            manifestLink.href = blobUrl;
          }
        } catch { /* best-effort manifest update */ }
      }
    })();
  }, []);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <FaviconUpdater />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/ai-consultant" element={<AIConsultant />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/services" element={<Services />} />
                <Route path="/loyalty" element={<Loyalty />} />
                <Route path="/bundles" element={<Bundles />} />
                <Route path="/about" element={<About />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/home-designer" element={<HomeDesigner />} />
                <Route path="/app-simulator" element={<AppSimulator />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/legal/:page" element={<Legal />} />
                <Route path="/login" element={<Login />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Analytics />
              <SpeedInsights />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
