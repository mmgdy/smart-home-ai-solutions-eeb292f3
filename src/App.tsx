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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
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
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/legal/:page" element={<Legal />} />
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
