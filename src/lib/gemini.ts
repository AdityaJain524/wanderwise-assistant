import { Itinerary } from './mockData';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface GeminiResponse {
  text: string;
  error?: string;
  isFallback?: boolean;
  itineraries?: Itinerary[];
}

// List of models to try - prioritized by STABILITY and AVAILABILITY
const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-1.5-flash'
];

export const generateTravelResponse = async (
  messages: { role: string; content: string }[],
  language: string = 'en',
  travelMode: string = 'plane',
  tradeoffPreference: number = 50,
  customerContext: string = ''
): Promise<GeminiResponse> => {
  const userMessage = messages[messages.length - 1].content;
  
  // Extract intent for context - improved regex to handle "CityA to CityB" format
  const citiesMatch = userMessage.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+on|\s+at|$)/i) || 
                      userMessage.match(/([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+on|\s+at|$)/i);
  
  let fromCity = 'Mumbai';
  let toCity = 'Delhi';

  if (citiesMatch) {
    fromCity = citiesMatch[1].trim();
    toCity = citiesMatch[2].trim();
  } else {
    // Fallback to individual matches if the pair isn't found
    const fromMatch = userMessage.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|$)/i);
    const toMatch = userMessage.match(/to\s+([a-zA-Z\s]+?)(?:\s+from|\s+on|\s+at|$)/i);
    if (fromMatch) fromCity = fromMatch[1].trim();
    if (toMatch) toCity = toMatch[1].trim();
  }

  // If no API key, we MUST use local fallback
  if (!GEMINI_API_KEY) {
    console.warn("Missing Gemini API Key - using local fallback");
    return { ...generateLocalResponse(userMessage, travelMode, tradeoffPreference), isFallback: true };
  }

  const systemPrompt = `You are an expert Travel Agent with real-time knowledge.
  CONTEXT: 
  - User Language: ${language}
  - Route: ${fromCity} to ${toCity}
  - Preference: ${tradeoffPreference}% (0=Budget, 100=Luxury)
  ${customerContext ? `- CUSTOMER PROFILE: ${customerContext}` : ''}
  
  TASK:
  1. Provide the BEST travel options for ALL THREE modes: FLIGHT, TRAIN, and BUS for this route.
  2. For EACH mode, generate at least one recommendation.
  3. Total of 3-5 distinct options.
  4. LOCAL AMENITIES: Identify nearest hospital and a recommended cafe for each hotel.
  5. BOOKING TIPS: Mention cancellation/insurance.
  
  OUTPUT FORMAT (JSON ONLY):
  {
    "summaries": {
      "plane": "Detailed flight-specific summary...",
      "train": "Detailed train-specific summary...",
      "bus": "Detailed bus-specific summary..."
    },
    "options": [
      {
        "type": "budget|balanced|comfort",
        "transport": { 
          "mode": "plane|train|bus",
          "name": "Operator Name", 
          "number": "Number", 
          "depTime": "HH:MM", 
          "arrTime": "HH:MM", 
          "duration": "XH YM", 
          "price": 1234,
          "comfortRating": 4
        },
        "hotel": { 
          "name": "Hotel Name", 
          "price": 1234, 
          "rating": 3.5,
          "nearestHospital": "Name",
          "recommendedCafe": "Name"
        },
        "description": "Short reasoning",
        "bookingTips": "Tips"
      }
    ]
  }`;

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Attempting Gemini API call with model: ${model}`);
      
      let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      let requestBody = {
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\nUser Request: ' + userMessage }] }]
      };

      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
         apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
         response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
         });
      }

      if (response.ok) {
        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (textResponse) {
          try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            const cleanedJson = jsonMatch ? jsonMatch[0] : textResponse;
            const parsed = JSON.parse(cleanedJson);
            
            if (parsed.options) {
               const itineraries = mapGeminiToItineraries(parsed.options, fromCity, toCity);
               const content = formatGeminiTextWithModes(parsed.summaries, itineraries);
               return { text: content, itineraries };
            }
          } catch (e) {
            console.error('JSON Parse Error:', e);
          }
        }
      }
    } catch (e) {
      console.warn(`Model ${model} failed`, e);
    }
  }

  return {
    text: "⚠️ **Connection Error:** I was unable to fetch live travel data. Please check your connection.",
    itineraries: [],
    error: "API_FAILED"
  };
};

const mapGeminiToItineraries = (options: any[], from: string, to: string): Itinerary[] => {
  return options.map((opt, idx) => {
    const mode = opt.transport.mode || 'plane';
    return {
      id: `ai-${mode}-${idx}-${Date.now()}`,
      type: opt.type || (idx === 0 ? 'budget' : idx === 1 ? 'balanced' : 'comfort'),
      transportMode: mode as 'plane' | 'train' | 'bus',
      flight: {
        id: `fl-${idx}`,
        airline: opt.transport.name,
        flightNo: opt.transport.number,
        departure: { city: from, airport: from.slice(0,3).toUpperCase(), time: opt.transport.depTime, date: new Date().toISOString().split('T')[0] },
        arrival: { city: to, airport: to.slice(0,3).toUpperCase(), time: opt.transport.arrTime, date: new Date().toISOString().split('T')[0] },
        duration: opt.transport.duration,
        price: opt.transport.price,
        stops: 0,
        isRedEye: false,
        comfortScore: opt.transport.comfortRating || (opt.type === 'budget' ? 5 : (opt.type === 'comfort' ? 9 : 7))
      },
      hotel: {
        id: `ht-${idx}`,
        name: opt.hotel.name,
        city: to,
        rating: opt.hotel.rating,
        pricePerNight: opt.hotel.price,
        amenities: opt.type === 'comfort' ? ['WiFi', 'Pool', 'Spa'] : ['WiFi', 'AC'],
        roomType: opt.type === 'comfort' ? 'Suite' : 'Standard',
        comfortScore: opt.type === 'budget' ? 5 : (opt.type === 'comfort' ? 9 : 7),
        nearestHospital: opt.hotel.nearestHospital,
        recommendedCafe: opt.hotel.recommendedCafe
      },
      totalCost: opt.transport.price + (opt.hotel.price * 2),
      totalDuration: opt.transport.duration,
      explanation: [opt.description, opt.bookingTips].filter(Boolean),
      risks: [],
      priceTrend: 'stable',
      confidenceScore: 90
    };
  });
};

const formatGeminiTextWithModes = (summaries: any, itineraries: Itinerary[]) => {
  let text = "";
  const modes: ('plane' | 'train' | 'bus')[] = ['plane', 'train', 'bus'];
  
  modes.forEach(mode => {
    const modeSummary = summaries?.[mode] || `Details for ${mode} travel.`;
    const modeItin = itineraries.find(i => i.transportMode === mode);
    const fromCity = itineraries[0]?.flight?.departure?.city || "your origin";
    const toCity = itineraries[0]?.flight?.arrival?.city || "your destination";
    
    text += `<${mode.toUpperCase()}>\n`;
    text += `### 🌍 ${mode.toUpperCase()} Option: ${fromCity} to ${toCity}\n\n`;
    text += `${modeSummary}\n\n`;
    
    if (modeItin) {
      text += `**Quick Stats:**\n`;
      text += `*   **Total Price:** ₹${modeItin.totalCost.toLocaleString()}\n`;
      text += `*   **Hospital:** ${modeItin.hotel.nearestHospital || 'Nearby'}\n`;
      text += `*   **Cafe:** ${modeItin.hotel.recommendedCafe || 'Nearby'}\n\n`;
      
      const bookUrl = mode === 'plane' ? 'https://www.makemytrip.com/' : (mode === 'train' ? 'https://www.irctc.co.in/' : 'https://www.redbus.in/');
      const bookLabel = mode === 'plane' ? 'Book Flight' : (mode === 'train' ? 'Book Train' : 'Book Bus');
      text += `[👉 Click here to ${bookLabel} Now](${bookUrl})\n`;
      text += `[👉 Search Hotels on Booking.com](https://www.booking.com/searchresults.html?ss=${encodeURIComponent(toCity)})\n`;
    }
    
    text += `</${mode.toUpperCase()}>\n`;
  });

  return text;
};

const generateLocalResponse = (input: string, travelMode: string, tradeoff: number = 50): { text: string; itineraries: Itinerary[] } => {
  const citiesMatch = input.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+on|\s+at|$)/i) || 
                      input.match(/([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+on|\s+at|$)/i);
  
  let fromCity = 'Mumbai';
  let toCity = 'Delhi';

  if (citiesMatch) {
    fromCity = citiesMatch[1].trim();
    toCity = citiesMatch[2].trim();
  } else {
    // Fallback to individual matches
    const fromMatch = input.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|$)/i);
    const toMatch = input.match(/to\s+([a-zA-Z\s]+?)(?:\s+from|\s+on|\s+at|$)/i);
    if (fromMatch) fromCity = fromMatch[1].trim();
    if (toMatch) toCity = toMatch[1].trim();
  }
  
  const displayFrom = fromCity.charAt(0).toUpperCase() + fromCity.slice(1);
  const displayTo = toCity.charAt(0).toUpperCase() + toCity.slice(1);

  const createItinerary = (mode: 'plane' | 'train' | 'bus', type: 'budget' | 'balanced' | 'comfort'): Itinerary => {
    const tradeoffMultiplier = 0.8 + (tradeoff / 100) * 0.4;
    const basePrice = mode === 'bus' ? 800 : (mode === 'train' ? 1200 : 4500);
    const typeMultiplier = type === 'budget' ? 1 : (type === 'balanced' ? 1.5 : 2.5);
    const cost = Math.round(basePrice * typeMultiplier * tradeoffMultiplier);
    const hotelPrice = Math.round((type === 'budget' ? 1200 : (type === 'balanced' ? 3500 : 9000)) * tradeoffMultiplier);
    const seed = (fromCity.length + toCity.length) * (mode === 'bus' ? 1 : (mode === 'train' ? 2 : 3));
    const duration = mode === 'bus' ? "12h 30m" : (mode === 'train' ? "8h 45m" : "2h 10m");
    const departureTime = (8 + (seed % 10)).toString().padStart(2, '0') + ':30';
    const arrivalTime = (14 + (seed % 8)).toString().padStart(2, '0') + ':15';
    
    return {
      id: `itin-${mode}-${type}-${Date.now()}`,
      type,
      transportMode: mode,
      flight: {
        id: `fl-${mode}-${seed}`,
        airline: mode === 'bus' ? 'RedBus Partner' : (mode === 'train' ? 'Indian Railways' : (type === 'budget' ? 'IndiGo' : 'Vistara')),
        flightNo: mode === 'bus' ? `BUS-${100 + (seed % 900)}` : (mode === 'train' ? `${12000 + seed}` : `UK-${900 + (seed % 99)}`),
        departure: { city: displayFrom, airport: displayFrom.slice(0, 3).toUpperCase(), time: departureTime, date: new Date().toISOString().split('T')[0] },
        arrival: { city: displayTo, airport: displayTo.slice(0, 3).toUpperCase(), time: arrivalTime, date: new Date().toISOString().split('T')[0] },
        duration,
        price: cost,
        stops: 0,
        isRedEye: type === 'budget' && (seed % 2 === 0),
        comfortScore: Math.min(10, (type === 'budget' ? 4 : (type === 'balanced' ? 7 : 9)) + Math.round(tradeoff / 50)),
      },
      hotel: {
        id: `ht-${mode}-${seed}`,
        name: type === 'budget' ? `${displayTo} Comfort Stay` : (type === 'balanced' ? `${displayTo} Regency` : `${displayTo} Grand Plaza`),
        city: displayTo,
        rating: Math.min(5, (type === 'budget' ? 3.0 : (type === 'balanced' ? 4.0 : 4.5)) + (tradeoff / 200)),
        pricePerNight: hotelPrice,
        amenities: tradeoff > 60 ? ['WiFi', 'AC', 'Pool', 'Breakfast', 'Spa'] : ['WiFi', 'AC', 'Breakfast'],
        roomType: tradeoff > 80 ? 'Luxury Suite' : 'Deluxe Room',
        comfortScore: type === 'budget' ? 5 : 9,
      },
      totalCost: cost + (hotelPrice * 2),
      totalDuration: duration,
      explanation: [`Local ${mode} ${type} option.`],
      risks: [],
      priceTrend: 'stable',
      confidenceScore: 85,
    };
  };

  const itineraries = [
    createItinerary('plane', 'balanced'),
    createItinerary('train', 'balanced'),
    createItinerary('bus', 'budget')
  ];
  
  const summaries = {
    plane: "Standard flight options for this route.",
    train: "Comfortable rail journeys available.",
    bus: "Economic road travel options."
  };
  
  const text = formatGeminiTextWithModes(summaries, itineraries);
  return { text, itineraries };
};