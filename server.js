import express from "express";
import { createServer } from "http";

const app = express();
const PORT = process.env.PORT || 3000;
const SALLY_API_URL =
  process.env.SALLY_API_URL || "https://cynicalsally-web.onrender.com";

app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cynical Sally</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e0e0e0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; color: #f5c518; }
    p.tagline { color: #888; margin-bottom: 2rem; }
    form { width: 100%; max-width: 700px; display: flex; flex-direction: column; gap: 1rem; }
    textarea { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #e0e0e0; font-family: monospace; font-size: 0.9rem; padding: 1rem; height: 260px; resize: vertical; }
    select, button { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-size: 1rem; }
    select { background: #1a1a1a; color: #e0e0e0; border: 1px solid #333; }
    button { background: #f5c518; color: #0f0f0f; font-weight: 700; cursor: pointer; }
    button:hover { background: #e0b300; }
    #result { width: 100%; max-width: 700px; margin-top: 1.5rem; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 1.5rem; white-space: pre-wrap; font-family: monospace; font-size: 0.85rem; display: none; }
    .row { display: flex; gap: 0.75rem; }
    .row select { flex: 1; }
    #status { color: #888; font-size: 0.85rem; margin-top: 0.5rem; min-height: 1.2em; }
  </style>
</head>
<body>
  <h1>Cynical Sally</h1>
  <p class="tagline">The code reviewer with zero filter.</p>
  <form id="reviewForm">
    <textarea id="code" placeholder="Paste your code here…" required></textarea>
    <div class="row">
      <select id="mode">
        <option value="quick">Quick review</option>
        <option value="full_truth">Full truth</option>
      </select>
      <select id="tone">
        <option value="cynical">Cynical</option>
        <option value="neutral">Neutral</option>
        <option value="professional">Professional</option>
      </select>
    </div>
    <button type="submit">Roast my code</button>
    <div id="status"></div>
  </form>
  <pre id="result"></pre>
  <script>
    const form = document.getElementById('reviewForm');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = 'Sally is reading your code…';
      result.style.display = 'none';
      try {
        const res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{ path: 'paste.txt', content: document.getElementById('code').value }],
            mode: document.getElementById('mode').value,
            tone: document.getElementById('tone').value,
          })
        });
        const data = await res.json();
        result.textContent = JSON.stringify(data, null, 2);
        result.style.display = 'block';
        status.textContent = '';
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
      }
    });
  </script>
</body>
</html>`);
});

app.post("/api/review", async (req, res) => {
  const { files, mode = "quick", tone = "cynical", lang, deviceId, target } =
    req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "No files provided." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const upstream = await fetch(`${SALLY_API_URL}/api/v1/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SALLY_FLAGSHIP_KEY
          ? { "X-Sally-Flagship-Key": process.env.SALLY_FLAGSHIP_KEY }
          : {}),
      },
      body: JSON.stringify({ files, mode, tone, lang, deviceId, target }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      res.status(504).json({ error: "Review timed out." });
    } else {
      res.status(502).json({ error: "Upstream error.", detail: err.message });
    }
  }
});

app.get("/api/quips", async (_req, res) => {
  try {
    const upstream = await fetch(
      `${SALLY_API_URL}/api/v1/quips?type=code`,
      { headers: { "Content-Type": "application/json" } }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream error.", detail: err.message });
  }
});

createServer(app).listen(PORT, () => {
  console.log(`Cynical Sally running on port ${PORT}`);
  console.log(`Backend API: ${SALLY_API_URL}`);
});
