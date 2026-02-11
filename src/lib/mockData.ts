// Mock flight and hotel data for demo purposes

export interface Flight {
  id: string;
  airline: string;
  flightNo: string;
  departure: {
    city: string;
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    city: string;
    airport: string;
    time: string;
    date: string;
  };
  duration: string;
  price: number;
  stops: number;
  layoverDuration?: string;
  isRedEye: boolean;
  comfortScore: number;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  rating: number;
  pricePerNight: number;
  amenities: string[];
  roomType: string;
  comfortScore: number;
  nearestHospital?: string;
  recommendedCafe?: string;
}

export interface Itinerary {
  id: string;
  type: 'budget' | 'balanced' | 'comfort';
  transportMode?: 'plane' | 'train' | 'bus';
  flight: Flight;
  hotel: Hotel;
  totalCost: number;
  totalDuration: string;
  explanation: string[];
  risks: string[];
  priceTrend: 'rising' | 'stable' | 'dropping';
  confidenceScore: number;
}

export const mockFlights: Flight[] = [
  {
    id: 'fl1',
    airline: 'IndiGo',
    flightNo: '6E-2045',
    departure: { city: 'Mumbai', airport: 'BOM', time: '06:00', date: '2024-02-15' },
    arrival: { city: 'Delhi', airport: 'DEL', time: '08:15', date: '2024-02-15' },
    duration: '2h 15m',
    price: 4500,
    stops: 0,
    isRedEye: false,
    comfortScore: 7,
  },
  {
    id: 'fl2',
    airline: 'Air India',
    flightNo: 'AI-680',
    departure: { city: 'Mumbai', airport: 'BOM', time: '10:30', date: '2024-02-15' },
    arrival: { city: 'Delhi', airport: 'DEL', time: '12:45', date: '2024-02-15' },
    duration: '2h 15m',
    price: 6200,
    stops: 0,
    isRedEye: false,
    comfortScore: 8,
  },
  {
    id: 'fl3',
    airline: 'Vistara',
    flightNo: 'UK-955',
    departure: { city: 'Mumbai', airport: 'BOM', time: '14:00', date: '2024-02-15' },
    arrival: { city: 'Delhi', airport: 'DEL', time: '16:20', date: '2024-02-15' },
    duration: '2h 20m',
    price: 8500,
    stops: 0,
    isRedEye: false,
    comfortScore: 9,
  },
  {
    id: 'fl4',
    airline: 'SpiceJet',
    flightNo: 'SG-8123',
    departure: { city: 'Mumbai', airport: 'BOM', time: '23:30', date: '2024-02-15' },
    arrival: { city: 'Delhi', airport: 'DEL', time: '01:45', date: '2024-02-16' },
    duration: '2h 15m',
    price: 3200,
    stops: 0,
    isRedEye: true,
    comfortScore: 5,
  },
  {
    id: 'fl5',
    airline: 'IndiGo',
    flightNo: '6E-2189',
    departure: { city: 'Mumbai', airport: 'BOM', time: '08:00', date: '2024-02-15' },
    arrival: { city: 'Delhi', airport: 'DEL', time: '11:30', date: '2024-02-15' },
    duration: '3h 30m',
    price: 3800,
    stops: 1,
    layoverDuration: '45m',
    isRedEye: false,
    comfortScore: 6,
  },
];

export const mockHotels: Hotel[] = [
  {
    id: 'h1',
    name: 'Budget Inn Express',
    city: 'Delhi',
    rating: 3.2,
    pricePerNight: 1500,
    amenities: ['WiFi', 'AC', 'TV'],
    roomType: 'Standard',
    comfortScore: 5,
  },
  {
    id: 'h2',
    name: 'Holiday Inn',
    city: 'Delhi',
    rating: 4.0,
    pricePerNight: 4500,
    amenities: ['WiFi', 'AC', 'TV', 'Breakfast', 'Gym', 'Pool'],
    roomType: 'Deluxe',
    comfortScore: 7,
  },
  {
    id: 'h3',
    name: 'The Oberoi',
    city: 'Delhi',
    rating: 4.8,
    pricePerNight: 12000,
    amenities: ['WiFi', 'AC', 'TV', 'Breakfast', 'Gym', 'Pool', 'Spa', 'Butler Service', 'Airport Transfer'],
    roomType: 'Luxury Suite',
    comfortScore: 10,
  },
  {
    id: 'h4',
    name: 'Treebo Trend',
    city: 'Delhi',
    rating: 3.8,
    pricePerNight: 2200,
    amenities: ['WiFi', 'AC', 'TV', 'Breakfast'],
    roomType: 'Standard',
    comfortScore: 6,
  },
];

export const generateItineraries = (nights: number = 2): Itinerary[] => {
  const budgetFlight = mockFlights[3]; // SpiceJet red-eye (cheapest)
  const balancedFlight = mockFlights[0]; // IndiGo morning
  const comfortFlight = mockFlights[2]; // Vistara

  const budgetHotel = mockHotels[0];
  const balancedHotel = mockHotels[1];
  const comfortHotel = mockHotels[2];

  return [
    {
      id: 'itin-budget',
      type: 'budget',
      flight: budgetFlight,
      hotel: budgetHotel,
      totalCost: budgetFlight.price * 2 + budgetHotel.pricePerNight * nights,
      totalDuration: '2 days',
      explanation: [
        '💰 Lowest total cost at ₹' + (budgetFlight.price * 2 + budgetHotel.pricePerNight * nights).toLocaleString(),
        '✈️ SpiceJet offers competitive pricing',
        '🏨 Basic but clean accommodation',
        '📍 Centrally located for easy commute',
      ],
      risks: [
        '⚠️ Red-eye flight may cause fatigue',
        '⚠️ Limited hotel amenities',
        '⚠️ No included meals',
      ],
      priceTrend: 'rising',
      confidenceScore: 72,
    },
    {
      id: 'itin-balanced',
      type: 'balanced',
      flight: balancedFlight,
      hotel: balancedHotel,
      totalCost: balancedFlight.price * 2 + balancedHotel.pricePerNight * nights,
      totalDuration: '2 days',
      explanation: [
        '⚖️ Best value for money option',
        '✈️ Convenient morning departure',
        '🏨 4-star hotel with breakfast included',
        '🏊 Pool and gym access for relaxation',
        '👴 Suitable for senior citizens',
      ],
      risks: [
        '⚠️ Moderate pricing - not the cheapest',
      ],
      priceTrend: 'stable',
      confidenceScore: 89,
    },
    {
      id: 'itin-comfort',
      type: 'comfort',
      flight: comfortFlight,
      hotel: comfortHotel,
      totalCost: comfortFlight.price * 2 + comfortHotel.pricePerNight * nights,
      totalDuration: '2 days',
      explanation: [
        '✨ Premium experience throughout',
        '✈️ Vistara full-service with meals',
        '🏨 5-star Oberoi luxury accommodations',
        '🚗 Complimentary airport transfers',
        '💆 Spa and wellness facilities',
        '👴 Ideal for senior citizens needing comfort',
      ],
      risks: [],
      priceTrend: 'dropping',
      confidenceScore: 95,
    },
  ];
};

export const sampleQueries = [
  "Family trip to Delhi with senior citizen, avoid long layovers",
  "Business travel Mumbai to Delhi, fastest route under 10k budget",
  "Weekend getaway for couple, prefer comfort over cost",
  "Group of 5 friends, cheapest option for Goa trip",
  "Solo traveler, need flexible booking options",
];