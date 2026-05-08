import { NextResponse } from "next/server";

type ChatRequest = {
  question: string;
  context: {
    customerName: string;
    recommendedModel: string;
    recommendedTrim: string;
    monthlyPayment: number;
    matchedDealer: string;
    inventoryStatus: string;
    leadScore: number;
    leadLabel: string;
    nextAction: string;
    alternatives: string[];
  };
};

const IN_SCOPE_TOPICS = [
  "amc",
  "amc motors",
  "recommendation",
  "vehicle",
  "model",
  "trim",
  "monthly",
  "payment",
  "apr",
  "loan",
  "budget",
  "quote",
  "inventory",
  "dealer",
  "test drive",
  "appointment",
  "lead",
  "follow-up",
  "follow up",
  "nova",
  "terrain",
  "summit",
  "voltis"
];

const BLOCKED_BRANDS = [
  "toyota",
  "honda",
  "tesla",
  "bmw",
  "hyundai",
  "ford",
  "audi",
  "mercedes",
  "nissan",
  "chevrolet",
  "kia",
  "lexus"
];

const OUT_OF_SCOPE_REPLY =
  "I can only answer AMC Motors project questions (recommendations, pricing, inventory, dealer match, appointments, lead scoring, and follow-up). Please ask about your AMC options in this demo.";

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

const EXPLICITLY_OFF_TOPIC = [
  "weather",
  "news",
  "politics",
  "stock market",
  "bitcoin",
  "recipe",
  "medical",
  "homework",
  "movie",
  "sports score",
  "travel visa"
];

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "LLM mode is not configured. Add OPENAI_API_KEY in your .env.local file." },
      { status: 400 }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question || "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const relevantContextTerms = [
    body.context.recommendedModel.toLowerCase(),
    body.context.recommendedTrim.toLowerCase(),
    body.context.matchedDealer.toLowerCase(),
    ...body.context.alternatives.map((x) => x.toLowerCase())
  ];
  const inScopeByTopic = containsAny(question, IN_SCOPE_TOPICS);
  const inScopeByContext = containsAny(question, relevantContextTerms);
  const mentionsBlockedBrand = containsAny(question, BLOCKED_BRANDS);
  const explicitlyOffTopic = containsAny(question, EXPLICITLY_OFF_TOPIC);
  const isLikelyFollowUp = question.split(/\s+/).length <= 5;

  // Allow short follow-up prompts (e.g., "explain in detail") as long as they are not blocked.
  // This keeps the chat natural while still enforcing AMC-only scope.
  const shouldBlock =
    mentionsBlockedBrand ||
    explicitlyOffTopic ||
    (!inScopeByTopic && !inScopeByContext && !isLikelyFollowUp);

  if (shouldBlock) {
    return NextResponse.json({ reply: OUT_OF_SCOPE_REPLY });
  }

  const systemPrompt = `You are AMC Motors AI Sales Advisor.
Rules:
- Only discuss fictional AMC Motors vehicles and dealers.
- Never mention real car brands.
- Be concise, practical, and sales-assistant friendly.
- Ground responses strictly in provided context.
- If user asks outside context, say what data is available and guide them back.
- Do not fabricate unavailable data.
- Keep answer under 90 words.
`;

  const contextBlock = `Customer: ${body.context.customerName}
Recommended: ${body.context.recommendedModel} ${body.context.recommendedTrim}
Est. Monthly Payment: $${body.context.monthlyPayment.toFixed(0)}
Matched Dealer: ${body.context.matchedDealer}
Inventory Status: ${body.context.inventoryStatus}
Lead: ${body.context.leadScore} (${body.context.leadLabel})
Next Action: ${body.context.nextAction}
Alternatives: ${body.context.alternatives.join(", ")}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${contextBlock}\n\nCustomer question:\n${body.question}` }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `LLM request failed: ${text}` }, { status: 500 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "No response from LLM." }, { status: 500 });
    }
    if (containsAny(content, BLOCKED_BRANDS)) {
      return NextResponse.json({ reply: OUT_OF_SCOPE_REPLY });
    }

    return NextResponse.json({ reply: content });
  } catch {
    return NextResponse.json({ error: "Unable to reach LLM service." }, { status: 500 });
  }
}
