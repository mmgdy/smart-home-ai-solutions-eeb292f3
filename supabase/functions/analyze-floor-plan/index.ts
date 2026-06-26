// Analyze floor plan / room photo — powered by Google Gemini 2.0 Flash (free tier).
// Gemini detects rooms and places smart-home devices on the image, returning
// a structured JSON the frontend overlays on the floor plan.
//
// Gemini free tier: 1,500 req/day, 15 req/min — generous for an e-commerce store.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoomDetection { type: string; name: string; count: number; }
interface FeatureSuggestion { roomType: string; features: string[]; }
interface DevicePlacement {
  type: string; emoji: string; x: number; y: number; room: string; label: string;
}
interface FloorPlanAnalysis {
  roomsDetected: RoomDetection[];
  suggestedFeatures: FeatureSuggestion[];
  devicePlacements: DevicePlacement[];
  estimatedArea?: number;
  notes?: string;
}

const PHOTO_SYSTEM_PROMPT = `You are a smart home consultant analyzing a real photo of a home room. Identify the room type and suggest smart home devices that could realistically be installed.

Return ONLY this JSON structure with no markdown, no extra text:
{
  "roomsDetected": [
    { "type": "living_room", "name": "Living Room", "count": 1 }
  ],
  "suggestedFeatures": [
    { "roomType": "living_room", "features": ["smart_lighting", "smart_curtains", "smart_ac"] }
  ],
  "devicePlacements": [
    { "type": "smart_switch", "emoji": "💡", "x": 25, "y": 40, "room": "Living Room", "label": "Smart Light Switch" }
  ],
  "notes": "Modern living room"
}

For devicePlacements:
- x and y are PERCENTAGES (0-100) of the image dimensions, pointing to the realistic installation spot visible in the photo
- Place devices at real mounting locations: switches near doors, AC controllers on walls, cameras in upper corners, motion sensors high on walls
- Suggest 4-10 devices based on visible features in the photo
- Use emojis: 💡 light switch, ❄️ AC controller, 🪟 curtain motor, 📷 security camera, 🔐 smart lock, 👁️ motion sensor, 🚪 door sensor, 🔌 smart plug, 🚨 smoke detector, 🌡️ thermostat

Valid room types: living_room, bedroom, master_bedroom, kitchen, bathroom, dining_room, office, hallway, entrance, balcony, garage, kids_room`;

const FALLBACK_ANALYSIS: FloorPlanAnalysis = {
  roomsDetected: [
    { type: "living_room", name: "Living Room", count: 1 },
    { type: "bedroom", name: "Bedroom", count: 2 },
    { type: "bathroom", name: "Bathroom", count: 1 },
    { type: "kitchen", name: "Kitchen", count: 1 },
  ],
  suggestedFeatures: [
    { roomType: "living_room", features: ["smart_lighting", "smart_curtains", "smart_ac"] },
    { roomType: "bedroom", features: ["smart_lighting", "smart_curtains", "smart_ac"] },
    { roomType: "bathroom", features: ["smart_lighting", "water_leak_sensor"] },
    { roomType: "kitchen", features: ["smart_lighting", "smoke_detector", "smart_plug"] },
  ],
  devicePlacements: [
    { type: "smart_switch", emoji: "💡", x: 25, y: 40, room: "Living Room", label: "Smart Lights" },
    { type: "smart_ac", emoji: "❄️", x: 70, y: 20, room: "Bedroom", label: "AC Controller" },
    { type: "camera", emoji: "📷", x: 5, y: 5, room: "Entrance", label: "Camera" },
    { type: "smoke_detector", emoji: "🚨", x: 50, y: 10, room: "Kitchen", label: "Smoke Detector" },
    { type: "smart_lock", emoji: "🔐", x: 3, y: 50, room: "Entrance", label: "Smart Lock" },
    { type: "motion_sensor", emoji: "👁️", x: 90, y: 70, room: "Living Room", label: "Motion Sensor" },
  ],
  notes: "Standard apartment layout detected (fallback)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { imageUrl, imageBase64, mimeType, mode } = body || {};

    if (!imageUrl && !imageBase64) {
      return new Response(JSON.stringify({ success: false, error: "imageUrl or imageBase64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "Floor plan analysis not configured. Please set GEMINI_API_KEY.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isPhotoMode = mode === "photo";
    console.log(`Analyzing ${isPhotoMode ? "room photo" : "floor plan"}:`, imageUrl ? "url" : "base64");

    // Use inline base64 for reliability (Gemini can't always fetch arbitrary URLs).
    const imageUrlValue = imageBase64
      ? `data:${mimeType || "image/jpeg"};base64,${imageBase64}`
      : imageUrl;

    const floorPlanSystemPrompt = `You are a smart home consultant analyzing floor plans. Analyze the floor plan image and return a single JSON object.

Return ONLY this JSON structure with no markdown, no extra text:
{
  "roomsDetected": [
    { "type": "living_room", "name": "Living Room", "count": 1 },
    { "type": "bedroom", "name": "Bedroom", "count": 2 }
  ],
  "suggestedFeatures": [
    { "roomType": "living_room", "features": ["smart_lighting", "smart_curtains", "smart_ac"] },
    { "roomType": "bedroom", "features": ["smart_lighting", "smart_curtains", "smart_ac"] }
  ],
  "devicePlacements": [
    { "type": "smart_switch", "emoji": "💡", "x": 25, "y": 40, "room": "Living Room", "label": "Smart Lights" },
    { "type": "smart_ac", "emoji": "❄️", "x": 80, "y": 15, "room": "Master Bedroom", "label": "AC Controller" },
    { "type": "camera", "emoji": "📷", "x": 5, "y": 5, "room": "Entrance", "label": "Security Camera" }
  ],
  "estimatedArea": 120,
  "notes": "Modern apartment layout with open floor plan"
}

For devicePlacements:
- x and y are PERCENTAGES (0-100) of the image width and height
- Place devices at logical positions INSIDE each room (near walls, corners, or doorways)
- Provide 6-15 devices covering all detected rooms
- Use these emojis: 💡 lights, ❄️ AC, 🪟 curtains, 📷 camera, 🔐 lock, 👁️ motion sensor, 🚪 door sensor, 🔌 smart plug, 🚨 smoke detector, 💧 water sensor, 🌡️ thermostat, 🔊 speaker
- Spread devices across the entire floor plan, not clustered in one corner

Valid room types: living_room, bedroom, master_bedroom, kitchen, bathroom, dining_room, office, hallway, entrance, balcony, garden, garage, kids_room, guest_room
Valid features: smart_lighting, smart_curtains, smart_ac, motion_sensor, door_sensor, temperature_sensor, smart_lock, camera, intercom, smart_plug, smart_switch, rgb_lighting, water_leak_sensor, smoke_detector, smart_thermostat`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${geminiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-flash-latest",
        messages: [
          { role: "system", content: isPhotoMode ? PHOTO_SYSTEM_PROMPT : floorPlanSystemPrompt },
          { role: "user", content: [
            {
              type: "text",
              text: isPhotoMode
                ? "Analyze this room photo. Identify the room type and mark where to install smart devices."
                : "Analyze this floor plan. Identify all rooms and place smart home devices at their exact positions.",
            },
            { type: "image_url", image_url: { url: imageUrlValue } },
          ]},
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText.slice(0, 300));

      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // On other errors, return the fallback layout so the UI still renders.
      return new Response(JSON.stringify({ success: true, analysis: FALLBACK_ANALYSIS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ success: true, analysis: FALLBACK_ANALYSIS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Gemini response:", content.slice(0, 200));

    let analysis: FloorPlanAnalysis;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      analysis = JSON.parse(jsonStr.trim());
      if (!analysis.devicePlacements) analysis.devicePlacements = [];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      analysis = FALLBACK_ANALYSIS;
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
