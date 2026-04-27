const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoomDetection {
  type: string;
  name: string;
  count: number;
}

interface FeatureSuggestion {
  roomType: string;
  features: string[];
}

interface DevicePlacement {
  type: string;
  emoji: string;
  x: number; // percentage of image width (0-100)
  y: number; // percentage of image height (0-100)
  room: string;
  label: string;
}

interface FloorPlanAnalysis {
  roomsDetected: RoomDetection[];
  suggestedFeatures: FeatureSuggestion[];
  devicePlacements: DevicePlacement[];
  estimatedArea?: number;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing floor plan:', imageUrl);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a smart home consultant analyzing floor plans. Analyze the floor plan image and return a single JSON object.

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
Valid features: smart_lighting, smart_curtains, smart_ac, motion_sensor, door_sensor, temperature_sensor, smart_lock, camera, intercom, smart_plug, smart_switch, rgb_lighting, water_leak_sensor, smoke_detector, smart_thermostat`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this floor plan. Identify all rooms and place smart home devices at their exact positions in the image.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'API credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze floor plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No analysis returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

    let analysis: FloorPlanAnalysis;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      analysis = JSON.parse(jsonStr.trim());
      if (!analysis.devicePlacements) analysis.devicePlacements = [];
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      analysis = {
        roomsDetected: [
          { type: 'living_room', name: 'Living Room', count: 1 },
          { type: 'bedroom', name: 'Bedroom', count: 2 },
          { type: 'bathroom', name: 'Bathroom', count: 1 },
          { type: 'kitchen', name: 'Kitchen', count: 1 },
        ],
        suggestedFeatures: [
          { roomType: 'living_room', features: ['smart_lighting', 'smart_curtains', 'smart_ac'] },
          { roomType: 'bedroom', features: ['smart_lighting', 'smart_curtains', 'smart_ac'] },
          { roomType: 'bathroom', features: ['smart_lighting', 'water_leak_sensor'] },
          { roomType: 'kitchen', features: ['smart_lighting', 'smoke_detector', 'smart_plug'] },
        ],
        devicePlacements: [
          { type: 'smart_switch', emoji: '💡', x: 25, y: 40, room: 'Living Room', label: 'Smart Lights' },
          { type: 'smart_ac', emoji: '❄️', x: 70, y: 20, room: 'Bedroom', label: 'AC Controller' },
          { type: 'camera', emoji: '📷', x: 5, y: 5, room: 'Entrance', label: 'Camera' },
          { type: 'smoke_detector', emoji: '🚨', x: 50, y: 10, room: 'Kitchen', label: 'Smoke Detector' },
          { type: 'smart_lock', emoji: '🔐', x: 3, y: 50, room: 'Entrance', label: 'Smart Lock' },
          { type: 'motion_sensor', emoji: '👁️', x: 90, y: 70, room: 'Living Room', label: 'Motion Sensor' },
        ],
        notes: 'Standard apartment layout detected (AI parsing fallback)',
      };
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
