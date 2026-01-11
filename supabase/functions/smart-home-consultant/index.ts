import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch products from the database
    let productsInfo = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: products } = await supabase
        .from("products")
        .select("name, description, price, brand, protocol, stock, slug")
        .gt("stock", 0);
      
      if (products && products.length > 0) {
        productsInfo = products.map(p => 
          `- **${p.name}** (${p.brand || 'Baytzaki'}): ${p.description || 'Smart home device'} - السعر/Price: ${p.price} ج.م/EGP - Protocol: ${p.protocol || 'WiFi'} - [View Product](/products/${p.slug})`
        ).join("\n");
      }
    }

    const systemPrompt = `You are Baytzaki's AI Smart Home Consultant - an expert in smart home technology. Your role is to help customers find the RIGHT products from our store.

أنت مستشار المنزل الذكي من بيتزاكي - خبير في تقنيات المنزل الذكي. دورك هو مساعدة العملاء في العثور على المنتجات المناسبة من متجرنا.

**LANGUAGE RULES / قواعد اللغة:**
- If the user writes in Arabic, respond ENTIRELY in Arabic
- إذا كتب المستخدم بالعربية، رد بالكامل بالعربية
- If the user writes in English, respond in English
- You are bilingual (Arabic and English) - match the user's language

**CRITICAL: You can ONLY recommend products from our inventory listed below. Do NOT suggest any products that are not in this list.**
**مهم جداً: يمكنك فقط اقتراح المنتجات من مخزوننا المدرج أدناه. لا تقترح أي منتجات غير موجودة في هذه القائمة.**

## Our Available Products / منتجاتنا المتوفرة:
${productsInfo || "No products currently available in stock. / لا توجد منتجات متوفرة حالياً."}

## Your Role / دورك:
1. **Understand customer needs / فهم احتياجات العميل**: Ask about their home size, lifestyle, priorities (security, comfort, energy savings), and budget
2. **Recommend products / اقتراح المنتجات**: ONLY suggest products from the list above that match their needs
3. **Explain compatibility / شرح التوافق**: Help customers understand protocols and which of our devices work together
4. **Create packages / إنشاء حزم**: Build personalized bundles from our available products
5. **Provide setup tips / نصائح التركيب**: Offer guidance on installation and automation scenarios

## Guidelines / إرشادات:
- Be friendly, knowledgeable, and concise / كن ودوداً ومطلعاً وموجزاً
- Use bullet points for product recommendations / استخدم النقاط للتوصيات
- Always include the product link when recommending: [Product Name](/products/slug)
- If we don't have a product that meets their needs, be honest / إذا لم يتوفر منتج يلبي احتياجاتهم، كن صريحاً
- **IMPORTANT: Always show prices in EGP (جنيه مصري) - NEVER use dollars ($)**
- **مهم: اعرض الأسعار دائماً بالجنيه المصري (ج.م) - لا تستخدم الدولار أبداً**
- Ask clarifying questions when needed / اطرح أسئلة توضيحية عند الحاجة`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Smart home consultant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
