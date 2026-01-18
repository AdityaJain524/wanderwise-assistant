import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, tradeoffPreference } = await req.json();

    const systemPrompt = `You are an AI Travel Copilot assistant for travel agents. You help agents plan travel itineraries for their customers.

Language: Respond in ${language || 'English'}. Adapt your responses to be culturally appropriate.

Current preference setting: ${tradeoffPreference || 50}% (0 = Budget focused, 50 = Balanced, 100 = Comfort focused)

Your capabilities:
1. Understand travel requirements (destinations, dates, number of travelers, special needs)
2. Suggest optimized travel options based on the preference slider
3. Explain WHY you recommend each option (price advantage, comfort score, safety)
4. Flag risks (short layovers, red-eye flights, visa requirements)
5. Remember customer preferences mentioned in the conversation

When generating recommendations:
- Always provide 3 options: Budget, Balanced, and Comfort
- Include flight and hotel details with pricing in Indian Rupees (₹)
- Add explainability markers for each recommendation
- Flag any travel risks or concerns
- Consider senior citizens, families, or special requirements mentioned

Format your itinerary responses with clear sections:
- Flight options with times, airlines, and prices
- Hotel recommendations with ratings and amenities
- Total cost breakdown
- Recommendations based on the current preference setting

Be conversational, helpful, and ask clarifying questions when needed.`;

    const response = await fetch('https://api.lovable.dev/ai', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      console.error('Lovable API error:', errorText);
      throw new Error(`Lovable API error: ${response.status}`);
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
