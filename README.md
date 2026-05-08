# AMC Motors AI Sales Advisor

A polished proof-of-concept automotive brand web app for a Systems Analysis and Project Management class project.

This app demonstrates how a fictional manufacturer (AMC Motors) can use agentic AI workflows to improve:

- customer preference collection
- model and trim recommendation
- pricing and affordability transparency
- inventory visibility and dealer routing
- appointment conversion
- lead scoring and follow-up

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Hardcoded local sample data (no real APIs)

## What the Demo Includes

1. AMC Motors branded landing page
2. Fictional 6-model AMC vehicle lineup
3. AI Sales Advisor guided form experience
4. AMC-only recommendation engine with top 3 options and match scores
5. Payment estimation using a 6% APR / 60-month financing formula
6. Simulated dealer + inventory matching (offers, distance, rating)
7. Appointment scheduling confirmation
8. Lead scoring dashboard with next best action
9. Editable AI-generated follow-up email preview
10. Dealer Lead Summary section for handoff

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Optional LLM Explanation Mode

The app includes two advisor chat modes:

- `Local Advisor Mode` (default): deterministic, no external API
- `LLM Explanation Mode`: uses OpenAI API for richer conversational explanations

To enable LLM mode, create `.env.local` in the project root:

```bash
OPENAI_API_KEY=your_api_key_here
```

Without this key, the app gracefully falls back to local advisor logic.

## Project Structure

- `src/app/page.tsx` - main branded page and interactive advisor experience
- `src/lib/data.ts` - fictional AMC vehicles, trims, dealers, inventory, offers
- `src/lib/advisor.ts` - recommendation logic, pricing calculations, dealer matching, lead scoring, follow-up message generation
- `src/app/globals.css` - Tailwind styling and shared UI utility classes

## Scope Notes

This is intentionally a proof-of-concept:

- no authentication
- no payments
- no external APIs
- no real dealership integrations
- no real email sending
