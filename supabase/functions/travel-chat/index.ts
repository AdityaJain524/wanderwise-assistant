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

    const systemPrompt = `You are an AI Travel Copilot assistant for travel agents. 
Language: Respond in ${language || 'English'}.
Current preference setting: ${tradeoffPreference || 50}% (0 = Budget focused, 50 = Balanced, 100 = Comfort focused)

TASK:
1. Provide the BEST travel options across ALL THREE modes: FLIGHT, TRAIN, and BUS for the requested route.
2. For each mode, provide the most relevant recommendation.
3. Compare them based on price, duration, and comfort.
4. LOCAL AMENITIES: Identify the nearest hospital and a recommended cafe near the destination hotel.
5. BOOKING TIPS: Include cancellation policies, insurance, and document requirements.

CRITICAL FORMATTING RULES:
1. DO NOT use asterisks (*) or markdown bold/italic formatting for links.
2. Use plain text with clear section headers.
3. Include ACTUAL clickable booking URLs in your response.

RESPONSE FORMAT (FOLLOW THIS EXACTLY):

Travel Comparison: [Origin] to [Destination]

---

✈️ FLIGHT OPTION
Operator: [name]
Duration: [Xh Xm] | Price: ₹[amount]
Hotel: [name]
Hospital: [name] | Cafe: [name]
Booking Tip: [policy/insurance]
Book Flight: https://www.makemytrip.com/flights/

---

🚄 TRAIN OPTION
Operator: [name]
Duration: [Xh Xm] | Price: ₹[amount]
Hotel: [name]
Hospital: [name] | Cafe: [name]
Booking Tip: [policy/insurance]
Book Train: https://www.irctc.co.in/nget/train-search

---

🚌 BUS OPTION
Operator: [name]
Duration: [Xh Xm] | Price: ₹[amount]
Hotel: [name]
Hospital: [name] | Cafe: [name]
Booking Tip: [policy/insurance]
Book Bus: https://www.redbus.in/bus-tickets/[origin]-to-[destination]

---

MY RECOMMENDATION:
[Compare modes and recommend one based on the user's preference slider and specific needs.]

How would you rate this response? (1-5 stars)`;

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
