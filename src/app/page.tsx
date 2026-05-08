"use client";

import { useMemo, useState } from "react";
import { computeLeadScore, evaluateVehicleInMind, financeOptions, fuelPrefOptions, generateFollowUpMessage, generateLocalAdvisorChatReply, getMatchedDealer, getPricing, getRecommendations, priorityOptions, timelineOptions, vehiclePrefOptions, type AdvisorInput } from "@/lib/advisor";
import { vehicles } from "@/lib/data";

const defaultInput: AdvisorInput = {
  customerName: "",
  hasVehicleInMind: "no",
  vehicleInMind: "",
  budgetMin: 25000,
  budgetMax: 42000,
  preferredMonthlyPayment: 650,
  vehicleTypePreference: "no preference",
  fuelPreference: "no preference",
  familySize: 2,
  commuteMiles: 20,
  mainPriority: "fuel efficiency",
  buyingTimeline: "within 1 month",
  financePreference: "finance",
  downPayment: 4500,
  location: ""
};

export default function Home() {
  const [portalMode, setPortalMode] = useState<"customer" | "dealer" | null>(null);
  const [input, setInput] = useState<AdvisorInput>(defaultInput);
  const [advisorStarted, setAdvisorStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [formError, setFormError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [advisorMode, setAdvisorMode] = useState<"local" | "llm">("local");
  const [chatLoading, setChatLoading] = useState(false);

  const recommendations = useMemo(() => getRecommendations(input), [input]);
  const topRecommendation = recommendations[0];
  const vehicleInMindEvaluation = useMemo(() => evaluateVehicleInMind(input, recommendations), [input, recommendations]);
  const pricing = topRecommendation ? getPricing(topRecommendation.vehicle, topRecommendation.trim, input.downPayment) : null;
  const matchedDealer = topRecommendation ? getMatchedDealer(topRecommendation.vehicle.model) : null;
  const lead = useMemo(() => {
    if (!pricing || !topRecommendation) return null;
    return computeLeadScore(input, pricing, pricing.msrp, Boolean(selectedSlot));
  }, [input, pricing, topRecommendation, selectedSlot]);

  const followUpMessage = useMemo(() => {
    if (!topRecommendation || !pricing || !matchedDealer) return "";
    return generateFollowUpMessage({
      customerName: input.customerName || "Customer",
      model: topRecommendation.vehicle.model,
      trim: topRecommendation.trim,
      monthlyPayment: pricing.monthlyPayment,
      dealer: matchedDealer.name,
      appointmentSlot: selectedSlot || undefined
    });
  }, [input.customerName, topRecommendation, pricing, matchedDealer, selectedSlot]);
  const [editableEmail, setEditableEmail] = useState("");

  const startAdvisor = () => {
    setAdvisorStarted(true);
    setSubmitted(false);
    setSelectedSlot("");
    setFormError("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.customerName.trim()) {
      setFormError("Please enter customer name to run the AI recommendation.");
      return;
    }
    if (!input.location.trim()) {
      setFormError("Please enter ZIP code or city to continue.");
      return;
    }
    if (input.hasVehicleInMind === "yes" && !input.vehicleInMind) {
      setFormError("Please choose the AMC model already in mind.");
      return;
    }
    setFormError("");
    setSubmitted(true);
    setEditableEmail(followUpMessage);
    setChatMessages([
      {
        role: "assistant",
        text: `Your AI recommendation is ready. I suggest ${topRecommendation?.vehicle.model} ${topRecommendation?.trim}. Ask me anything about pricing, inventory, dealer match, or alternatives.`
      }
    ]);
    setTimeout(() => {
      document.getElementById("offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const askAdvisor = async () => {
    if (!chatInput.trim() || !submitted || !topRecommendation || !matchedDealer || !pricing || !lead || chatLoading) return;
    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userText }]);
    setChatInput("");

    if (advisorMode === "local") {
      const reply = generateLocalAdvisorChatReply({
        userMessage: userText,
        customerName: input.customerName,
        model: topRecommendation.vehicle.model,
        trim: topRecommendation.trim,
        monthlyPayment: pricing.monthlyPayment,
        dealer: matchedDealer.name,
        inventoryStatus: matchedDealer.inventoryStatusByModel[topRecommendation.vehicle.model],
        leadLabel: lead.label,
        leadScore: lead.score,
        nextAction: lead.nextAction,
        alternatives: recommendations.slice(1).map((r) => `${r.vehicle.model} ${r.trim}`)
      });
      setChatMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      return;
    }

    setChatLoading(true);
    try {
      const res = await fetch("/api/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          context: {
            customerName: input.customerName || "Customer",
            recommendedModel: topRecommendation.vehicle.model,
            recommendedTrim: topRecommendation.trim,
            monthlyPayment: pricing.monthlyPayment,
            matchedDealer: matchedDealer.name,
            inventoryStatus: matchedDealer.inventoryStatusByModel[topRecommendation.vehicle.model],
            leadScore: lead.score,
            leadLabel: lead.label,
            nextAction: lead.nextAction,
            alternatives: recommendations.slice(1).map((r) => `${r.vehicle.model} ${r.trim}`)
          }
        })
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "LLM response failed");
      }
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply! }]);
    } catch {
      const fallback = generateLocalAdvisorChatReply({
        userMessage: userText,
        customerName: input.customerName,
        model: topRecommendation.vehicle.model,
        trim: topRecommendation.trim,
        monthlyPayment: pricing.monthlyPayment,
        dealer: matchedDealer.name,
        inventoryStatus: matchedDealer.inventoryStatusByModel[topRecommendation.vehicle.model],
        leadLabel: lead.label,
        leadScore: lead.score,
        nextAction: lead.nextAction,
        alternatives: recommendations.slice(1).map((r) => `${r.vehicle.model} ${r.trim}`)
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `LLM mode is unavailable right now, so I switched to local advisor logic.\n\n${fallback}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const sectionTitle = "text-xl font-semibold tracking-tight";
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold tracking-wider text-white">AMC MOTORS</h1>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-6 text-sm text-slate-200 md:flex">
              <a href="#vehicles">Vehicles</a>
              <a href="#offers">Offers</a>
              <a href="#advisor">AI Advisor</a>
              <a href="#inventory">Inventory</a>
              <a href="#dealers">Dealers</a>
            </nav>
            {portalMode && (
              <button type="button" onClick={() => setPortalMode(null)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">
                Switch Login
              </button>
            )}
          </div>
        </div>
      </header>

      {!portalMode && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-semibold text-white">Choose Portal Access</h2>
            <p className="mt-3 text-slate-300">Proof-of-concept role routing for AMC Motors. No real authentication is used in this class demo.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setPortalMode("customer")}
                className="rounded-xl border border-white/15 bg-white/5 p-5 text-left hover:bg-white/10"
              >
                <p className="text-lg font-semibold text-white">Customer View</p>
                <p className="mt-2 text-sm text-slate-300">Vehicle lineup, AI advisor, affordability, inventory, and scheduling experience.</p>
              </button>
              <button
                type="button"
                onClick={() => setPortalMode("dealer")}
                className="rounded-xl border border-brand-500/40 bg-brand-500/15 p-5 text-left hover:bg-brand-500/20"
              >
                <p className="text-lg font-semibold text-brand-100">Dealer Login</p>
                <p className="mt-2 text-sm text-slate-200">Dealer AI features: lead scoring, next action intelligence, and follow-up drafting.</p>
              </button>
            </div>
          </div>
        </section>
      )}

      {portalMode === "customer" && (
      <>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-brand-100/40 bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-100">Agentic Automotive Sales Experience</p>
          <h2 className="text-4xl font-semibold leading-tight text-white md:text-5xl">Find Your Perfect AMC Vehicle with AI</h2>
          <p className="mt-4 max-w-xl text-slate-300">
            Our agentic AI sales advisor helps you choose the right AMC model, understand pricing, check inventory, and schedule a test drive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={startAdvisor} className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
              Start AI Advisor
            </button>
            <a href="#vehicles" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10">
              Explore Vehicles
            </a>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white">How the AI Advisor Works</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><span className="font-semibold text-brand-100">AI Decision:</span> Collects preferences and ranks AMC-only vehicles with match scoring.</li>
            <li><span className="font-semibold text-brand-100">System Calculation:</span> Generates transparent quote, APR assumptions, and monthly estimate.</li>
            <li><span className="font-semibold text-brand-100">Inventory Match:</span> Checks local dealer availability and routes to best offer + closest dealer.</li>
            <li><span className="font-semibold text-brand-100">Dealer Action:</span> Produces lead score, recommended action, and editable follow-up draft.</li>
          </ul>
        </div>
      </section>

      <section id="vehicles" className="mx-auto max-w-7xl px-6 py-8">
        <h3 className={sectionTitle}>Vehicle Lineup</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <article key={vehicle.model} className="glass-card p-5">
              <h4 className="text-lg font-semibold text-white">{vehicle.model}</h4>
              <p className="mt-1 text-sm text-slate-300">{vehicle.type} • {vehicle.fuelType} • From ${vehicle.msrp.toLocaleString()}</p>
              <p className="mt-2 text-sm text-slate-300">{vehicle.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-white/10 px-2 py-1">{vehicle.efficiency}</span>
                <span className="rounded bg-white/10 px-2 py-1">Safety {vehicle.safetyRating}/5</span>
                <span className="rounded bg-white/10 px-2 py-1">Tech {vehicle.technologyScore}/10</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="advisor" className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form className="glass-card p-6" onSubmit={handleSubmit}>
            <h3 className={sectionTitle}>AI Sales Advisor</h3>
            {!advisorStarted ? (
              <p className="mt-3 text-sm text-slate-300">Start the advisor to run a guided recommendation workflow.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Customer name<input className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.customerName} onChange={(e) => setInput({ ...input, customerName: e.target.value })} /></label>
                <label className="text-sm">ZIP code or city<input className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.location} onChange={(e) => setInput({ ...input, location: e.target.value })} /></label>

                <label className="text-sm">Already have an AMC vehicle in mind?
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.hasVehicleInMind} onChange={(e) => setInput({ ...input, hasVehicleInMind: e.target.value as "yes" | "no" })}>
                    <option value="yes">Yes</option><option value="no">No</option>
                  </select>
                </label>
                {input.hasVehicleInMind === "yes" && (
                  <label className="text-sm">Model in mind
                    <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.vehicleInMind} onChange={(e) => setInput({ ...input, vehicleInMind: e.target.value })}>
                      <option value="">Select model</option>{vehicles.map((v) => <option key={v.model} value={v.model}>{v.model}</option>)}
                    </select>
                  </label>
                )}

                <label className="text-sm">Budget min ($)<input type="number" className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.budgetMin} onChange={(e) => setInput({ ...input, budgetMin: Number(e.target.value) })} /></label>
                <label className="text-sm">Budget max ($)<input type="number" className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.budgetMax} onChange={(e) => setInput({ ...input, budgetMax: Number(e.target.value) })} /></label>
                <label className="text-sm">Preferred monthly payment<input type="number" className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.preferredMonthlyPayment} onChange={(e) => setInput({ ...input, preferredMonthlyPayment: Number(e.target.value) })} /></label>
                <label className="text-sm">Down payment<input type="number" className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.downPayment} onChange={(e) => setInput({ ...input, downPayment: Number(e.target.value) })} /></label>

                <label className="text-sm">Vehicle type preference
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.vehicleTypePreference} onChange={(e) => setInput({ ...input, vehicleTypePreference: e.target.value as AdvisorInput["vehicleTypePreference"] })}>
                    {vehiclePrefOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className="text-sm">Fuel preference
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.fuelPreference} onChange={(e) => setInput({ ...input, fuelPreference: e.target.value as AdvisorInput["fuelPreference"] })}>
                    {fuelPrefOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className="text-sm">Family size<input type="number" min={1} className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.familySize} onChange={(e) => setInput({ ...input, familySize: Number(e.target.value) })} /></label>
                <label className="text-sm">Daily commute (miles)<input type="number" min={0} className="mt-1 w-full rounded-md border border-white/15 bg-white/5 p-2" value={input.commuteMiles} onChange={(e) => setInput({ ...input, commuteMiles: Number(e.target.value) })} /></label>

                <label className="text-sm">Main priority
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.mainPriority} onChange={(e) => setInput({ ...input, mainPriority: e.target.value as AdvisorInput["mainPriority"] })}>
                    {priorityOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className="text-sm">Buying timeline
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.buyingTimeline} onChange={(e) => setInput({ ...input, buyingTimeline: e.target.value as AdvisorInput["buyingTimeline"] })}>
                    {timelineOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">Finance preference
                  <select className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 p-2" value={input.financePreference} onChange={(e) => setInput({ ...input, financePreference: e.target.value as AdvisorInput["financePreference"] })}>
                    {financeOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
              </div>
            )}
            <button type={advisorStarted ? "submit" : "button"} onClick={!advisorStarted ? startAdvisor : undefined} className="mt-6 w-full rounded-md bg-brand-500 px-4 py-3 font-semibold text-white hover:bg-brand-700">
              {advisorStarted ? "Run AI Recommendation" : "Start AI Advisor"}
            </button>
            {formError && <p className="mt-3 rounded-md bg-amber-500/20 p-3 text-sm text-amber-100">{formError}</p>}
            {submitted && !formError && <p className="mt-3 rounded-md bg-emerald-500/20 p-3 text-sm text-emerald-100">AI recommendation generated. Review pricing, inventory, and dealer actions below.</p>}
          </form>

          <aside className="glass-card p-6">
            <h3 className={sectionTitle}>Top AMC Recommendations</h3>
            <div className="mt-4 space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.vehicle.model} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{rec.vehicle.model} {rec.trim}</p>
                    <span className="rounded bg-brand-500/30 px-2 py-1 text-xs font-semibold text-brand-100">{rec.matchScore}% Match</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">From ${(rec.vehicle.msrp + rec.vehicle.trims[rec.trim]).toLocaleString()} • {rec.vehicle.efficiency}</p>
                  <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">{rec.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              ))}
            </div>
            {vehicleInMindEvaluation && (
              <p className={`mt-4 rounded-lg p-3 text-sm ${vehicleInMindEvaluation.fits ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"}`}>{vehicleInMindEvaluation.message}</p>
            )}
          </aside>
        </div>
      </section>

      {submitted && topRecommendation && pricing && matchedDealer && lead && (
        <>
          <section id="offers" className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2">
            <article className="glass-card p-6">
              <h3 className={sectionTitle}>Quote and Affordability</h3>
              <div className="mt-4 space-y-2 text-sm">
                <Line label="Model + Trim" value={`${topRecommendation.vehicle.model} ${topRecommendation.trim}`} />
                <Line label="MSRP" value={`$${topRecommendation.vehicle.msrp.toLocaleString()}`} />
                <Line label="Trim adjustment" value={`$${pricing.trimAdjustment.toLocaleString()}`} />
                <Line label="Estimated taxes + fees" value={`$${pricing.taxesAndFees.toFixed(0)}`} />
                <Line label="Down payment" value={`$${pricing.downPayment.toLocaleString()}`} />
                <Line label="Estimated loan amount" value={`$${pricing.estimatedLoanAmount.toFixed(0)}`} />
                <Line label="APR assumption" value={`${pricing.apr}%`} />
                <Line label="Loan term" value={`${pricing.months} months`} />
                <Line label="Estimated monthly payment" value={`$${pricing.monthlyPayment.toFixed(0)}`} />
                <Line label="Total estimated cost" value={`$${pricing.totalEstimatedCost.toFixed(0)}`} />
              </div>
              <p className={`mt-4 rounded-lg p-3 text-sm ${pricing.monthlyPayment <= input.preferredMonthlyPayment ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"}`}>
                {pricing.monthlyPayment <= input.preferredMonthlyPayment
                  ? "AI Decision: This quote fits within your preferred monthly payment."
                  : "AI Decision: Monthly payment is above your target. Consider lower trim, larger down payment, lower-priced AMC model, or lease option."}
              </p>
            </article>

            <article id="inventory" className="glass-card p-6">
              <h3 className={sectionTitle}>Inventory and Dealer Matching</h3>
              <p className="mt-2 text-sm text-slate-300">Inventory Match: Ranked by offer value, distance, and dealer rating.</p>
              <div className="mt-4 space-y-2 text-sm">
                <Line label="Matched dealer" value={matchedDealer.name} />
                <Line label="Location" value={matchedDealer.location} />
                <Line label="Distance" value={`${matchedDealer.distanceMiles} miles`} />
                <Line label="Dealer rating" value={`${matchedDealer.rating}/5`} />
                <Line label="Inventory status" value={matchedDealer.inventoryStatusByModel[topRecommendation.vehicle.model]} />
                <Line label="Current offer" value={matchedDealer.offer} />
              </div>
            </article>
          </section>

          <section id="dealers" className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2">
            <article className="glass-card p-6">
              <h3 className={sectionTitle}>Appointment Scheduling</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {matchedDealer.appointmentSlots.map((slot) => (
                  <button key={slot} type="button" className={`rounded-md border p-2 text-sm ${selectedSlot === slot ? "border-brand-500 bg-brand-500/20 text-brand-100" : "border-white/20 hover:bg-white/10"}`} onClick={() => setSelectedSlot(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => setEditableEmail(generateFollowUpMessage({
                customerName: input.customerName,
                model: topRecommendation.vehicle.model,
                trim: topRecommendation.trim,
                monthlyPayment: pricing.monthlyPayment,
                dealer: matchedDealer.name,
                appointmentSlot: selectedSlot || undefined
              }))}>
                Schedule Test Drive
              </button>
              {selectedSlot && <p className="mt-3 rounded-lg bg-emerald-500/20 p-3 text-sm text-emerald-100">Your test drive for the {topRecommendation.vehicle.model} has been scheduled with {matchedDealer.name} on {selectedSlot}.</p>}
            </article>
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-16">
            <article className="glass-card p-6">
              <h3 className={sectionTitle}>Talk to the AI Advisor</h3>
              <p className="mt-2 text-sm text-slate-300">Conversational Q&A powered by the current AMC recommendation context and local advisor logic.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                <span>AMC Scope Locked</span>
                <span className="text-emerald-200/90">Only AMC Motors project data is allowed</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdvisorMode("local")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${advisorMode === "local" ? "bg-brand-500 text-white" : "bg-white/10 text-slate-200"}`}
                >
                  Local Advisor Mode
                </button>
                <button
                  type="button"
                  onClick={() => setAdvisorMode("llm")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${advisorMode === "llm" ? "bg-brand-500 text-white" : "bg-white/10 text-slate-200"}`}
                >
                  LLM Explanation Mode
                </button>
                <span className="text-xs text-slate-400">{advisorMode === "llm" ? "Uses /api/advisor-chat (requires OPENAI_API_KEY)." : "Deterministic local logic only."}</span>
              </div>
              <div className="mt-4 h-64 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
                {chatMessages.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`max-w-[90%] rounded-lg p-3 text-sm ${msg.role === "assistant" ? "bg-brand-500/20 text-brand-100" : "ml-auto bg-white/10 text-slate-100"}`}>
                    {msg.text}
                  </div>
                ))}
                {chatLoading && <div className="max-w-[90%] rounded-lg bg-brand-500/20 p-3 text-sm text-brand-100">Thinking with LLM...</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="w-full rounded-md border border-white/15 bg-slate-900 p-2 text-sm"
                  placeholder="Ask about recommendation, payment, inventory, alternatives, or next steps..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      askAdvisor();
                    }
                  }}
                />
                <button type="button" onClick={askAdvisor} disabled={chatLoading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Send
                </button>
              </div>
            </article>
          </section>
        </>
      )}
      </>
      )}

      {portalMode === "dealer" && (
        <section className="mx-auto max-w-7xl px-6 py-12 pb-16">
          <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-500/15 p-4 text-sm text-brand-100">
            Dealer Portal: AI-assisted lead handling is restricted to dealer users in this proof-of-concept.
          </div>
          {submitted && topRecommendation && pricing && matchedDealer && lead ? (
            <div className="grid gap-6">
              <article className="glass-card p-6">
                <h3 className={sectionTitle}>Lead Score Dashboard</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded bg-white/10 px-3 py-1 text-sm">Lead score: {lead.score}</span>
                  <span className={`rounded px-3 py-1 text-sm font-semibold ${lead.label === "Hot Lead" ? "bg-red-500/20 text-red-100" : lead.label === "Warm Lead" ? "bg-amber-500/20 text-amber-100" : "bg-slate-500/30 text-slate-100"}`}>{lead.label}</span>
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-300">{lead.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <p className="mt-4 rounded-lg bg-brand-500/20 p-3 text-sm text-brand-100"><span className="font-semibold">Dealer Action:</span> {lead.nextAction}</p>
              </article>

              <article className="glass-card p-6">
                <h3 className={sectionTitle}>AI Follow-up Message Preview</h3>
                <textarea className="mt-4 h-56 w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-sm" value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} />
              </article>

              <article className="glass-card p-6">
                <h3 className={sectionTitle}>Dealer Lead Summary</h3>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Line label="Customer" value={input.customerName} />
                  <Line label="Recommended model + trim" value={`${topRecommendation.vehicle.model} ${topRecommendation.trim}`} />
                  <Line label="Budget range" value={`$${input.budgetMin.toLocaleString()} - $${input.budgetMax.toLocaleString()}`} />
                  <Line label="Preferred monthly payment" value={`$${input.preferredMonthlyPayment}`} />
                  <Line label="Lead score" value={`${lead.score} (${lead.label})`} />
                  <Line label="Buying timeline" value={input.buyingTimeline} />
                  <Line label="Matched dealer" value={matchedDealer.name} />
                  <Line label="Recommended next action" value={lead.nextAction} />
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase text-slate-400">Follow-up message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{editableEmail}</p>
                </div>
              </article>
            </div>
          ) : (
            <article className="glass-card p-6">
              <h3 className={sectionTitle}>Dealer Lead Summary</h3>
              <p className="mt-3 text-sm text-slate-300">
                No lead is available yet. Run a customer recommendation first in Customer View, then switch to Dealer Login to review lead scoring, next best action, and follow-up draft.
              </p>
              <button type="button" onClick={() => setPortalMode("customer")} className="mt-5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Go to Customer View
              </button>
            </article>
          )}
        </section>
      )}
    </main>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </div>
  );
}
