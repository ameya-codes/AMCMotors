import { dealers, type BuyingTimeline, type Dealer, type FinancePreference, type FuelPreference, type MainPriority, type TrimName, type Vehicle, type VehiclePreference, vehicles } from "@/lib/data";

export type AdvisorInput = {
  customerName: string;
  hasVehicleInMind: "yes" | "no";
  vehicleInMind?: string;
  budgetMin: number;
  budgetMax: number;
  preferredMonthlyPayment: number;
  vehicleTypePreference: VehiclePreference;
  fuelPreference: FuelPreference;
  familySize: number;
  commuteMiles: number;
  mainPriority: MainPriority;
  buyingTimeline: BuyingTimeline;
  financePreference: FinancePreference;
  downPayment: number;
  location: string;
};

export type Recommendation = {
  vehicle: Vehicle;
  trim: TrimName;
  matchScore: number;
  reasoning: string[];
};

export type PricingResult = {
  msrp: number;
  trimAdjustment: number;
  taxesAndFees: number;
  downPayment: number;
  estimatedLoanAmount: number;
  apr: number;
  months: number;
  monthlyPayment: number;
  totalEstimatedCost: number;
};

const priorityMap: Record<MainPriority, keyof Vehicle> = {
  "low monthly payment": "resaleScore",
  "fuel efficiency": "reliabilityScore",
  safety: "safetyRating",
  "resale value": "resaleScore",
  technology: "technologyScore",
  comfort: "comfortScore",
  performance: "technologyScore"
};

const trimOrder: TrimName[] = ["Base", "Select", "Premium"];

function scoreVehicle(input: AdvisorInput, vehicle: Vehicle): number {
  let score = 50;
  if (input.vehicleTypePreference !== "no preference" && vehicle.classType === input.vehicleTypePreference) score += 14;
  if (input.fuelPreference !== "no preference" && vehicle.fuelType.toLowerCase() === input.fuelPreference.toLowerCase()) score += 14;
  if (input.familySize >= 4 && (vehicle.classType === "SUV" || vehicle.classType === "crossover")) score += 10;
  if (input.familySize <= 2 && vehicle.classType === "sedan") score += 8;
  if (input.commuteMiles >= 25 && (vehicle.fuelType === "Hybrid" || vehicle.fuelType === "EV")) score += 10;

  const priorityField = priorityMap[input.mainPriority];
  score += Number(vehicle[priorityField]) * 2;

  if (vehicle.msrp >= input.budgetMin && vehicle.msrp <= input.budgetMax) score += 18;
  if (vehicle.msrp > input.budgetMax) score -= 12;
  if (vehicle.msrp < input.budgetMin) score -= 4;

  if (input.mainPriority === "low monthly payment" && vehicle.msrp <= input.budgetMax) score += 8;
  if (input.mainPriority === "fuel efficiency" && (vehicle.fuelType === "Hybrid" || vehicle.fuelType === "EV")) score += 7;
  if (input.mainPriority === "performance" && vehicle.model === "AMC Summit") score += 4;

  return Math.max(0, Math.min(99, Math.round(score)));
}

function pickTrim(input: AdvisorInput, vehicle: Vehicle): TrimName {
  if (input.mainPriority === "technology" || input.mainPriority === "comfort") return "Premium";
  if (input.mainPriority === "low monthly payment") return vehicle.msrp > input.budgetMax - 2000 ? "Base" : "Select";
  if (input.preferredMonthlyPayment < 450) return "Base";
  return "Select";
}

export function calculateMonthlyPayment(principal: number, apr: number, months: number): number {
  const monthlyRate = apr / 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

export function getPricing(vehicle: Vehicle, trim: TrimName, downPayment: number): PricingResult {
  const apr = 0.06;
  const months = 60;
  const trimAdjustment = vehicle.trims[trim];
  const msrp = vehicle.msrp + trimAdjustment;
  const taxesAndFees = msrp * 0.0825 + 1295;
  const estimatedLoanAmount = Math.max(0, msrp + taxesAndFees - downPayment);
  const monthlyPayment = calculateMonthlyPayment(estimatedLoanAmount, apr, months);
  return {
    msrp,
    trimAdjustment,
    taxesAndFees,
    downPayment,
    estimatedLoanAmount,
    apr: apr * 100,
    months,
    monthlyPayment,
    totalEstimatedCost: monthlyPayment * months + downPayment
  };
}

export function getRecommendations(input: AdvisorInput): Recommendation[] {
  return vehicles
    .map((vehicle) => {
      const trim = pickTrim(input, vehicle);
      const matchScore = scoreVehicle(input, vehicle);
      const reasons = [
        `${vehicle.model} aligns with your ${input.mainPriority} priority.`,
        `${vehicle.efficiency} and ${vehicle.safetyRating.toFixed(1)}/5 safety help with total ownership confidence.`,
        `Best for ${vehicle.bestFor}.`
      ];
      return { vehicle, trim, matchScore, reasoning: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

export function evaluateVehicleInMind(input: AdvisorInput, recommendations: Recommendation[]): { fits: boolean; message: string } | null {
  if (input.hasVehicleInMind !== "yes" || !input.vehicleInMind) return null;
  const match = recommendations.find((r) => r.vehicle.model === input.vehicleInMind);
  if (match && match.matchScore >= 72) {
    return { fits: true, message: `${input.vehicleInMind} is a strong fit for your profile with a ${match.matchScore}% match score.` };
  }
  return {
    fits: false,
    message: `${input.vehicleInMind} may not be the best fit. Based on your profile, a higher-fit AMC alternative is recommended.`
  };
}

export function getMatchedDealer(model: string): Dealer {
  return dealers
    .filter((dealer) => dealer.availableModels.includes(model))
    .sort((a, b) => {
      if (b.offerValue !== a.offerValue) return b.offerValue - a.offerValue;
      if (a.distanceMiles !== b.distanceMiles) return a.distanceMiles - b.distanceMiles;
      return b.rating - a.rating;
    })[0];
}

export function computeLeadScore(input: AdvisorInput, pricing: PricingResult, selectedMsrp: number, scheduled: boolean): { score: number; label: "Hot Lead" | "Warm Lead" | "Cold Lead"; reasons: string[]; nextAction: string } {
  let score = 0;
  const reasons: string[] = [];

  if (input.buyingTimeline === "immediately" || input.buyingTimeline === "within 2 weeks") {
    score += 30;
    reasons.push("Buying timeline indicates near-term intent.");
  }
  if (input.hasVehicleInMind === "yes") {
    score += 15;
    reasons.push("Customer already has a specific AMC model in mind.");
  }
  if (pricing.monthlyPayment <= input.preferredMonthlyPayment * 1.05) {
    score += 20;
    reasons.push("Estimated payment is realistic vs customer preference.");
  }
  if (input.downPayment > selectedMsrp * 0.1) {
    score += 15;
    reasons.push("Down payment exceeds 10% of MSRP.");
  }
  if (scheduled) {
    score += 20;
    reasons.push("Customer has committed to a test-drive appointment.");
  }

  let label: "Hot Lead" | "Warm Lead" | "Cold Lead" = "Cold Lead";
  let nextAction = "Send educational buying guide and follow up later";
  if (score >= 75) {
    label = "Hot Lead";
    nextAction = "Schedule test drive and send finance quote";
  } else if (score >= 45) {
    label = "Warm Lead";
    nextAction = "Send vehicle comparison and follow up in 2 days";
  }

  return { score, label, reasons, nextAction };
}

export function generateFollowUpMessage(params: {
  customerName: string;
  model: string;
  trim: TrimName;
  monthlyPayment: number;
  dealer: string;
  appointmentSlot?: string;
}): string {
  const appointmentLine = params.appointmentSlot
    ? `Your test drive is confirmed for ${params.appointmentSlot} at ${params.dealer}.`
    : `We can reserve your preferred slot at ${params.dealer} whenever you're ready.`;
  return `Hi ${params.customerName},

Thank you for exploring AMC Motors with our AI Sales Advisor. Based on your goals, we recommend the ${params.model} ${params.trim}. Your estimated monthly payment is around $${params.monthlyPayment.toFixed(0)} (60 months at 6% APR, with your stated down payment).

${appointmentLine}

Reply to this message and we can also share a side-by-side comparison of your top AMC options and a tailored quote.

Best regards,
AMC Motors Sales Advisory Team`;
}

export function generateLocalAdvisorChatReply(params: {
  userMessage: string;
  customerName: string;
  model: string;
  trim: TrimName;
  monthlyPayment: number;
  dealer: string;
  inventoryStatus: string;
  leadLabel: "Hot Lead" | "Warm Lead" | "Cold Lead";
  leadScore: number;
  nextAction: string;
  alternatives: string[];
}): string {
  const q = params.userMessage.toLowerCase();

  if (q.includes("why") || q.includes("recommend")) {
    return `I recommended the ${params.model} ${params.trim} because it best matches your profile across budget, preference, and priority fit. Your estimated monthly payment is about $${params.monthlyPayment.toFixed(0)}, and this option ranked highest among AMC vehicles.`;
  }
  if (q.includes("monthly") || q.includes("payment") || q.includes("afford")) {
    return `Your current estimate is around $${params.monthlyPayment.toFixed(0)}/month for the ${params.model} ${params.trim}. If this feels high, we can switch to a lower trim, increase down payment, or compare another AMC model.`;
  }
  if (q.includes("inventory") || q.includes("stock") || q.includes("available")) {
    return `Inventory Match: ${params.model} is currently "${params.inventoryStatus}" at ${params.dealer}. I can also check nearby AMC alternatives if you'd like.`;
  }
  if (q.includes("dealer") || q.includes("where") || q.includes("location")) {
    return `Your best matched dealer is ${params.dealer}, optimized by current offer, distance, and rating.`;
  }
  if (q.includes("lead") || q.includes("next action") || q.includes("follow up")) {
    return `Current lead score is ${params.leadScore} (${params.leadLabel}). Recommended dealer action: ${params.nextAction}.`;
  }
  if (q.includes("alternative") || q.includes("other option") || q.includes("compare")) {
    return `Top AMC alternatives to compare are: ${params.alternatives.join(", ")}. I can explain trade-offs between them.`;
  }

  return `Great question, ${params.customerName || "there"}. Based on your profile, the current best fit is ${params.model} ${params.trim} at about $${params.monthlyPayment.toFixed(0)}/month, matched with ${params.dealer}. Ask me about pricing, alternatives, inventory, or lead status.`;
}

export const timelineOptions: BuyingTimeline[] = ["immediately", "within 2 weeks", "within 1 month", "just researching"];
export const financeOptions: FinancePreference[] = ["finance", "lease", "unsure"];
export const priorityOptions: MainPriority[] = ["low monthly payment", "fuel efficiency", "safety", "resale value", "technology", "comfort", "performance"];
export const vehiclePrefOptions: VehiclePreference[] = ["sedan", "SUV", "crossover", "no preference"];
export const fuelPrefOptions: FuelPreference[] = ["gas", "hybrid", "EV", "no preference"];
export const trimOptions: TrimName[] = trimOrder;
