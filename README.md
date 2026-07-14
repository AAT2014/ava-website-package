# AVA — All Access Travels chat widget

This package has two parts:

1. **`api/chat.js`** (and the `server-alternative/` folder) — a small backend that safely calls the Anthropic API using a secret key. This never runs in the visitor's browser.
2. **`widget/ava-widget.js`** — a standalone, dependency-free floating chat bubble you drop onto any page with one `<script>` tag.

The widget talks to your backend, and your backend talks to Anthropic. The visitor's browser never sees your API key.

---

## Step 1 — Get an API key

Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key, and keep it somewhere safe. You'll set it as an environment variable — never paste it directly into any file you upload to GitHub or a hosting provider's public folder.

## Step 2 — Deploy the backend

### Option A: Vercel (recommended, easiest)

1. Push this folder to a GitHub repo (or use the Vercel CLI directly on the folder).
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key from Step 1
4. Deploy. Vercel will automatically turn `api/chat.js` into a live endpoint at:
   `https://your-project.vercel.app/api/chat`
5. Test it:
   ```bash
   curl -X POST https://your-project.vercel.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hi!"}]}'
   ```
   You should get back `{"reply": "..."}`.

### Option B: Your own server (Render, Railway, a VPS, etc.)

Use `server-alternative/server.js` instead:

```bash
cd server-alternative
npm install
export ANTHROPIC_API_KEY=your-key-here
node server.js
```

This runs on port 3000 by default (`/api/chat`). Deploy it the way you'd deploy any Node app — the host just needs the `ANTHROPIC_API_KEY` environment variable set.

## Step 3 — Lock down CORS (before going fully live)

Both backend versions currently accept requests from any website (`"*"`). That's fine for testing, but before launch, restrict it to your real domain:

- In `api/chat.js`: change `ALLOWED_ORIGINS` to `["https://allaccesstravels.com"]`
- In `server-alternative/server.js`: change the `cors()` line to `cors({ origin: "https://allaccesstravels.com" })`

This stops other sites from quietly using your API key's quota through your endpoint.

## Step 4 — Add the widget to your website

Add one line before the closing `</body>` tag on any page you want AVA to appear on:

```html
<script src="https://yourdomain.com/path/to/ava-widget.js" data-backend="https://your-project.vercel.app/api/chat"></script>
```

- Host `ava-widget.js` anywhere static files can live (same server as your site, a CDN, or even the same Vercel project as the backend).
- The `data-backend` attribute tells the widget where your proxy lives — update it once you know your real backend URL.
- See `example-embed.html` for a working example page.

That's it — no other HTML, CSS, or JS needed. The script injects the floating bubble and chat panel itself and won't interfere with the rest of your page's styles.

## What visitors see

A circular launcher button (using your logo) sits in the bottom-right corner of the page. Clicking it opens AVA's chat panel with her introduction message, a few quick-start suggestion chips, and a text input. Closing it collapses back to just the bubble.

## Customizing later

- **Colors/copy**: edit the `css` and `GREETING`/`SUGGESTIONS` variables near the top of `ava-widget.js`.
- **AVA's personality**: edit `SYSTEM_PROMPT` in `api/chat.js` (and mirror any change in `server-alternative/server.js`).
- **Position on page**: change `bottom`/`right` in the `.ava-launcher` and `.ava-panel` CSS rules.
