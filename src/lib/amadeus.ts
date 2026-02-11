import { supabase } from "@/integrations/supabase/client";

export interface AmadeusFlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: {
    duration: string;
    segments: {
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }[];
  }[];
}

export const searchFlights = async (
  origin: string,
  destination: string,
  date: string
): Promise<AmadeusFlightOffer[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('amadeus-search', {
      body: {
        origin,
        destination,
        departureDate: date,
        adults: 1
      }
    });

    if (error) {
      console.warn('Amadeus Edge Function Error:', error);
      return [];
    }

    if (!data || !data.data) {
      console.warn('No flight data received from Amadeus');
      return [];
    }

    return data.data;
  } catch (err) {
    console.error('Failed to search flights:', err);
    return [];
  }
};
