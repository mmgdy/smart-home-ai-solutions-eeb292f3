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

interface FloorPlanAnalysis {
  roomsDetected: RoomDetection[];
  suggestedFeatures: FeatureSuggestion[];
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
            content: `You are a smart home consultant analyzing floor plans. Analyze the floor plan image and identify:
1. All rooms visible in the floor plan
2. Suggested smart home features for each room type
3. Estimated total area if visible

Return a JSON object with this exact structure:
{
  "roomsDetected": [
    { "type": "living_room", "name": "Living Room", "count": 1 },
    { "type": "bedroom", "name": "Bedroom", "count": 2 }
  ],
  "suggestedFeatures": [
    { "roomType": "living_room", "features": ["smart_lighting", "smart_curtains", "smart_ac"] },
    { "roomType": "bedroom", "features": ["smart_lighting", "smart_curtains", "smart_ac"] }
  ],
  "estimatedArea": 120,
  "notes": "Modern apartment layout with open floor plan"
}

Valid room types: living_room, bedroom, master_bedroom, kitchen, bathroom, dining_room, office, hallway, entrance, balcony, garden, garage, kids_room, guest_room

Valid features: smart_lighting, smart_curtains, smart_ac, motion_sensor, door_sensor, temperature_sensor, smart_lock, camera, intercom, smart_plug, smart_switch, rgb_lighting, water_leak_sensor, smoke_detector, smart_thermostat

IMPORTANT: Return ONLY valid JSON, no markdown formatting or additional text.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this floor plan and identify all rooms and suggest smart home features for each.'
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

    // Parse the JSON response
    let analysis: FloorPlanAnalysis;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return a default analysis if parsing fails
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
        notes: 'Standard apartment layout detected (AI parsing fallback)'
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
