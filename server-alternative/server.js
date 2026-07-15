// AVA backend proxy — plain Node/Express version
// Use this instead of /api/chat.js if you're NOT deploying to Vercel
// (e.g. you're running your own server, or hosting on Render/Railway/a VPS).
//
// Setup:
//   1. cd server-alternative
//   2. npm install express cors
//   3. Set the ANTHROPIC_API_KEY environment variable (see README)
//   4. node server.js
//   5. AVA's widget should point at: http://localhost:3000/api/chat (or your deployed URL)

const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

// Tighten this to your real domain(s) before going live, e.g.:
// app.use(cors({ origin: "https://allaccesstravels.com" }));
app.use(cors({ origin: "https://allaccesstravels.com));

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

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

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
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map(block => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n");

    res.json({ reply: text });
  } catch (err) {
    console.error("AVA proxy error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AVA backend proxy running on port ${PORT}`));
