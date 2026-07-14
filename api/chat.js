// AVA backend proxy — Vercel serverless function
// Deploy this folder to Vercel and it becomes: https://your-project.vercel.app/api/chat
//
// Why this file exists: the Anthropic API requires a secret key. That key must
// NEVER be placed in front-end code (anyone could open dev tools and steal it).
// This function runs on the server, holds the key in an environment variable,
// and simply forwards chat messages to Anthropic on the widget's behalf.

const SYSTEM_PROMPT = `You are AVA — the All Access Virtual Advisor — the AI travel twin for All Access Travels, a full-service travel agency. You speak with the warmth, enthusiasm, and expertise of a seasoned travel advisor who has personally helped hundreds of clients plan unforgettable trips.

Your job:
- Answer common travel questions (best time to visit places, visa/passport basics, packing tips, travel insurance, what to expect on cruises/resorts/tours, budgeting, accessibility considerations, etc.)
- Recommend trips and destinations based on what the person tells you about their interests, budget, travel style, and who they're traveling with
- Always sound like a real, experienced human travel agent — warm, knowledgeable, a little bit excited about travel, never robotic
- Keep answers conversational and not overly long — a few short paragraphs or a tight list, not an essay
- When recommending a destination or trip idea, give 2-3 concrete options with a one-line reason why each fits
- Naturally invite the person to reach out to All Access Travels to book or get a custom itinerary built for them — but only once per conversation, don't repeat it every message
- If asked something outside travel, gently steer back to how you can help with their next trip
- Never invent specific prices, exact availability, or real-time flight/hotel data — instead say pricing and availability are confirmed when they connect with an All Access Travels advisor

Keep responses focused and skimmable. Use occasional light formatting (short lists) when helpful, but don't overdo it.`;

// Set this to your real site(s) once you're live, e.g. ["https://allaccesstravels.com"]
const ALLOWED_ORIGINS = ["*"]; // tighten this before going live — see README

function setCors(res, origin) {
  const allowed = ALLOWED_ORIGINS.includes("*") ? "*" : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Basic guardrails: cap history length and message size so one visitor
    // can't run up a huge bill or send an oversized payload.
    console.log("KEY CHECK — exists:", !!process.env.ANTHROPIC_API_KEY, "length:", (process.env.ANTHROPIC_API_KEY || "").length, "starts with:", (process.env.ANTHROPIC_API_KEY || "").slice(0, 7));
    const trimmed = messages.slice(-20).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").slice(0, 4000)
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      res.status(502).json({ error: "Upstream API error" });
      return;
    }

    const data = await response.json();
    const text = (data.content || [])
      .map(block => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n");

    res.status(200).json({ reply: text });
  } catch (err) {
    console.error("AVA proxy error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}
