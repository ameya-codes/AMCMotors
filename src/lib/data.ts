export type TrimName = "Base" | "Select" | "Premium";
export type FuelType = "Gas" | "Hybrid" | "EV";
export type VehiclePreference = "sedan" | "SUV" | "crossover" | "no preference";
export type FuelPreference = "gas" | "hybrid" | "EV" | "no preference";
export type MainPriority = "low monthly payment" | "fuel efficiency" | "safety" | "resale value" | "technology" | "comfort" | "performance";
export type BuyingTimeline = "immediately" | "within 2 weeks" | "within 1 month" | "just researching";
export type FinancePreference = "finance" | "lease" | "unsure";
export type InventoryStatus = "In stock" | "Limited availability" | "Available in 2-4 weeks" | "Pre-order";

export type Vehicle = {
  model: string;
  type: "Compact sedan" | "Hybrid sedan" | "Compact SUV" | "Hybrid SUV" | "Mid-size premium SUV" | "Electric crossover";
  classType: "sedan" | "SUV" | "crossover";
  msrp: number;
  fuelType: FuelType;
  bestFor: string;
  efficiency: string;
  safetyRating: number;
  reliabilityScore: number;
  resaleScore: number;
  comfortScore: number;
  technologyScore: number;
  description: string;
  trims: Record<TrimName, number>;
  pros: string[];
  cons: string[];
};

export type Dealer = {
  name: string;
  location: string;
  distanceMiles: number;
  rating: number;
  availableModels: string[];
  inventoryCount: number;
  offer: string;
  offerValue: number;
  appointmentSlots: string[];
  inventoryStatusByModel: Record<string, InventoryStatus>;
};

export const vehicles: Vehicle[] = [
  {
    model: "AMC Nova",
    type: "Compact sedan",
    classType: "sedan",
    msrp: 24500,
    fuelType: "Gas",
    bestFor: "daily commute, first-time buyers",
    efficiency: "34 MPG",
    safetyRating: 4.7,
    reliabilityScore: 8.8,
    resaleScore: 8.2,
    comfortScore: 7.9,
    technologyScore: 7.8,
    description: "A practical, confidence-inspiring sedan with low ownership cost.",
    trims: { Base: 0, Select: 2200, Premium: 4700 },
    pros: ["Easy city driving", "Strong value", "Great for first-time buyers"],
    cons: ["Less cargo room", "Base trim has fewer premium features"]
  },
  {
    model: "AMC Nova Hybrid",
    type: "Hybrid sedan",
    classType: "sedan",
    msrp: 28900,
    fuelType: "Hybrid",
    bestFor: "fuel savings, commuting",
    efficiency: "52 MPG",
    safetyRating: 4.8,
    reliabilityScore: 9.0,
    resaleScore: 8.6,
    comfortScore: 8.1,
    technologyScore: 8.3,
    description: "Efficient hybrid performance with a smooth ride and smart cabin tech.",
    trims: { Base: 0, Select: 2600, Premium: 5200 },
    pros: ["Excellent fuel economy", "Quiet commute", "High resale confidence"],
    cons: ["Higher upfront cost than gas Nova", "Not performance focused"]
  },
  {
    model: "AMC Terrain",
    type: "Compact SUV",
    classType: "SUV",
    msrp: 31500,
    fuelType: "Gas",
    bestFor: "small families, city driving",
    efficiency: "30 MPG",
    safetyRating: 4.8,
    reliabilityScore: 8.7,
    resaleScore: 8.5,
    comfortScore: 8.5,
    technologyScore: 8.4,
    description: "A right-sized SUV for flexible daily life and weekend errands.",
    trims: { Base: 0, Select: 2800, Premium: 5900 },
    pros: ["Family-friendly cabin", "Strong all-around package", "Good visibility"],
    cons: ["Lower MPG than hybrid alternatives", "Premium trim gets expensive"]
  },
  {
    model: "AMC Terrain Hybrid",
    type: "Hybrid SUV",
    classType: "SUV",
    msrp: 36800,
    fuelType: "Hybrid",
    bestFor: "families, fuel efficiency, resale value",
    efficiency: "43 MPG",
    safetyRating: 4.9,
    reliabilityScore: 9.2,
    resaleScore: 9.1,
    comfortScore: 8.8,
    technologyScore: 8.6,
    description: "Efficient family SUV designed for comfort and long-term value.",
    trims: { Base: 0, Select: 3200, Premium: 6700 },
    pros: ["Balanced family + efficiency", "Excellent safety profile", "Great resale outlook"],
    cons: ["Pricier than gas SUV", "Limited base trim inventory"]
  },
  {
    model: "AMC Summit",
    type: "Mid-size premium SUV",
    classType: "SUV",
    msrp: 44500,
    fuelType: "Hybrid",
    bestFor: "families, comfort, road trips",
    efficiency: "38 MPG",
    safetyRating: 4.9,
    reliabilityScore: 9.1,
    resaleScore: 8.9,
    comfortScore: 9.4,
    technologyScore: 9.0,
    description: "Premium hybrid SUV delivering refined comfort and confidence.",
    trims: { Base: 0, Select: 3900, Premium: 8200 },
    pros: ["Premium interior comfort", "Advanced driver tech", "Road-trip ready"],
    cons: ["Higher monthly payment", "Larger footprint for tight parking"]
  },
  {
    model: "AMC Voltis",
    type: "Electric crossover",
    classType: "crossover",
    msrp: 48000,
    fuelType: "EV",
    bestFor: "technology-focused buyers, low fuel cost",
    efficiency: "310-mile range",
    safetyRating: 4.9,
    reliabilityScore: 9.0,
    resaleScore: 8.7,
    comfortScore: 8.9,
    technologyScore: 9.6,
    description: "An all-electric crossover with premium digital and connected features.",
    trims: { Base: 0, Select: 4300, Premium: 9000 },
    pros: ["High-tech user experience", "No gas cost", "Fast charging support"],
    cons: ["Highest MSRP in lineup", "Charging access varies by area"]
  }
];

export const dealers: Dealer[] = [
  {
    name: "AMC Motors Dallas",
    location: "Dallas, TX",
    distanceMiles: 8,
    rating: 4.8,
    availableModels: ["AMC Nova", "AMC Nova Hybrid", "AMC Terrain", "AMC Terrain Hybrid", "AMC Voltis"],
    inventoryCount: 52,
    offer: "$1,250 finance bonus + complimentary maintenance for 1 year",
    offerValue: 1250,
    appointmentSlots: ["Thu 10:30 AM", "Thu 2:00 PM", "Fri 11:00 AM", "Sat 9:30 AM"],
    inventoryStatusByModel: {
      "AMC Nova": "In stock",
      "AMC Nova Hybrid": "In stock",
      "AMC Terrain": "Limited availability",
      "AMC Terrain Hybrid": "In stock",
      "AMC Summit": "Available in 2-4 weeks",
      "AMC Voltis": "Limited availability"
    }
  },
  {
    name: "AMC Motors Fort Worth",
    location: "Fort Worth, TX",
    distanceMiles: 24,
    rating: 4.6,
    availableModels: ["AMC Nova", "AMC Terrain", "AMC Summit"],
    inventoryCount: 34,
    offer: "0.9% APR for 36 months on select AMC Terrain trims",
    offerValue: 950,
    appointmentSlots: ["Thu 1:30 PM", "Fri 10:00 AM", "Fri 4:00 PM", "Sat 12:00 PM"],
    inventoryStatusByModel: {
      "AMC Nova": "In stock",
      "AMC Nova Hybrid": "Available in 2-4 weeks",
      "AMC Terrain": "In stock",
      "AMC Terrain Hybrid": "Available in 2-4 weeks",
      "AMC Summit": "Limited availability",
      "AMC Voltis": "Pre-order"
    }
  },
  {
    name: "AMC Motors Plano",
    location: "Plano, TX",
    distanceMiles: 15,
    rating: 4.9,
    availableModels: ["AMC Nova Hybrid", "AMC Terrain Hybrid", "AMC Summit", "AMC Voltis"],
    inventoryCount: 41,
    offer: "$1,500 trade-up credit + EV home charger rebate",
    offerValue: 1500,
    appointmentSlots: ["Thu 11:00 AM", "Thu 3:30 PM", "Fri 1:00 PM", "Sat 10:00 AM"],
    inventoryStatusByModel: {
      "AMC Nova": "Available in 2-4 weeks",
      "AMC Nova Hybrid": "In stock",
      "AMC Terrain": "Limited availability",
      "AMC Terrain Hybrid": "In stock",
      "AMC Summit": "In stock",
      "AMC Voltis": "In stock"
    }
  },
  {
    name: "AMC Motors Irving",
    location: "Irving, TX",
    distanceMiles: 12,
    rating: 4.7,
    availableModels: ["AMC Nova", "AMC Terrain", "AMC Terrain Hybrid", "AMC Voltis"],
    inventoryCount: 37,
    offer: "$900 loyalty bonus for current AMC owners",
    offerValue: 900,
    appointmentSlots: ["Thu 9:00 AM", "Fri 12:30 PM", "Fri 5:00 PM", "Sat 1:30 PM"],
    inventoryStatusByModel: {
      "AMC Nova": "In stock",
      "AMC Nova Hybrid": "Limited availability",
      "AMC Terrain": "In stock",
      "AMC Terrain Hybrid": "Limited availability",
      "AMC Summit": "Pre-order",
      "AMC Voltis": "Available in 2-4 weeks"
    }
  },
  {
    name: "AMC Motors Grapevine",
    location: "Grapevine, TX",
    distanceMiles: 20,
    rating: 4.8,
    availableModels: ["AMC Nova", "AMC Nova Hybrid", "AMC Summit", "AMC Voltis"],
    inventoryCount: 29,
    offer: "2-year complimentary connected services package",
    offerValue: 1100,
    appointmentSlots: ["Thu 4:00 PM", "Fri 9:30 AM", "Sat 11:30 AM", "Sat 3:00 PM"],
    inventoryStatusByModel: {
      "AMC Nova": "Limited availability",
      "AMC Nova Hybrid": "In stock",
      "AMC Terrain": "Available in 2-4 weeks",
      "AMC Terrain Hybrid": "Pre-order",
      "AMC Summit": "In stock",
      "AMC Voltis": "Limited availability"
    }
  }
];
