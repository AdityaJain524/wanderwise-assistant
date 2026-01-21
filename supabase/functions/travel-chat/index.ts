import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const travelModeDescriptions = {
  bus: "Bus travel - focus on bus tickets, bus routes, bus operators, and road travel options. Do NOT suggest flights or train tickets.",
  train: "Train travel - focus on train tickets, railway routes, train classes, and rail travel options. Do NOT suggest flights or bus tickets.",
  plane: "Air travel - focus on flight tickets, airlines, airports, and air travel options. Do NOT suggest trains or bus tickets.",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, tradeoffPreference, travelMode } = await req.json();

    const modeRestriction = travelMode && travelModeDescriptions[travelMode as keyof typeof travelModeDescriptions]
      ? `\n\nIMPORTANT TRAVEL MODE RESTRICTION: The user has selected ${travelMode.toUpperCase()} as their preferred travel mode. ${travelModeDescriptions[travelMode as keyof typeof travelModeDescriptions]}\n\nALL your travel recommendations MUST be for ${travelMode} only. If the user asks about other travel modes, politely remind them their current mode is set to ${travelMode} and provide ${travelMode} options instead.`
      : '';

    // Helper function to generate booking URLs
    const getBookingUrls = (travelMode: string, from: string, to: string) => {
      const fromEncoded = encodeURIComponent(from || 'Delhi');
      const toEncoded = encodeURIComponent(to || 'Mumbai');
      const today = new Date().toISOString().split('T')[0];
      
      if (travelMode === 'bus') {
        return {
          transport: `https://www.redbus.in/bus-tickets/${fromEncoded.toLowerCase()}-to-${toEncoded.toLowerCase()}`,
          hotel: `https://www.booking.com/searchresults.html?ss=${toEncoded}`,
          restaurant: `https://www.zomato.com/${toEncoded.toLowerCase()}/restaurants`,
        };
      } else if (travelMode === 'train') {
        return {
          transport: `https://www.irctc.co.in/nget/train-search`,
          hotel: `https://www.booking.com/searchresults.html?ss=${toEncoded}`,
          restaurant: `https://www.zomato.com/${toEncoded.toLowerCase()}/restaurants`,
        };
      } else {
        return {
          transport: `https://www.makemytrip.com/flight/search?itinerary=${fromEncoded}-${toEncoded}-${today}&tripType=O&paxType=A-1_C-0_I-0&cabin=E`,
          hotel: `https://www.booking.com/searchresults.html?ss=${toEncoded}`,
          restaurant: `https://www.zomato.com/${toEncoded.toLowerCase()}/restaurants`,
        };
      }
    };

    const transportType = travelMode === 'bus' ? 'Bus' : travelMode === 'train' ? 'Train' : 'Flight';

    const systemPrompt = `You are an AI Travel Copilot assistant for travel agents. You help agents plan travel itineraries for their customers.

Language: Respond in ${language || 'English'}. Adapt your responses to be culturally appropriate.

Current preference setting: ${tradeoffPreference || 50}% (0 = Budget focused, 50 = Balanced, 100 = Comfort focused)
${modeRestriction}

CRITICAL FORMATTING RULES:
1. DO NOT use asterisks (*) or markdown bold/italic formatting
2. DO NOT use bullet points with asterisks
3. Use plain text with clear section headers
4. Use numbers (1, 2, 3) or dashes (-) for lists
5. Keep responses clean and easy to read

Your capabilities:
1. Understand travel requirements (destinations, dates, number of travelers, special needs)
2. Suggest optimized travel options based on the preference slider
3. Explain WHY you recommend each option (price advantage, comfort score, safety)
4. Flag risks (short layovers, red-eye travel, visa requirements)
5. Remember customer preferences mentioned in the conversation

When generating recommendations, you MUST:
1. Provide 3 options: Budget, Balanced, and Comfort
2. Include ${transportType} details with pricing in Indian Rupees (₹)
3. For EACH option, include ALL of these at the end of that option:
   - ${transportType} Booking: [Provide the booking platform name and explain how to search]
   - Hotel Booking: Use Booking.com to find hotels in the destination city
   - Restaurant Guide: Check Zomato for restaurant recommendations
4. Explain WHY each option is recommended (price advantage, comfort, timing)
5. Flag any travel risks or concerns

RESPONSE FORMAT (follow this structure):

${transportType} Travel Recommendations from [Origin] to [Destination]

OPTION 1: Budget Friendly
${transportType} Details: [operator/airline, timing, price ₹XXX]
Hotel Suggestion: [budget hotel name, ₹XXX per night]
Why this works: [brief explanation of value]
Risks: [any concerns]

Book ${transportType}: Search on ${travelMode === 'bus' ? 'RedBus' : travelMode === 'train' ? 'IRCTC' : 'MakeMyTrip'}
Book Hotel: Search on Booking.com for [destination]
Find Restaurants: Check Zomato for [destination]

OPTION 2: Balanced Value
[Same format]

OPTION 3: Premium Comfort
[Same format]

My Recommendation: [Which option suits their needs best and why]

After providing recommendations, always end with:
"How would you rate this response? (1-5 stars) Please share any feedback or changes you'd like!"

Be conversational and helpful. Do not use asterisks anywhere in your response.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in travel-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
