import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "GT FX GOAT AI backend is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4.1",
    },
  });
});

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY in .env",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No image uploaded. Use form-data with field name: image",
      });
    }

    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: "Unsupported image type. Use PNG, JPG, JPEG, or WEBP.",
      });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1";
    const base64Image = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const prompt = `
You are an AI trading assistant that analyzes a screenshot of a price chart.

Your job:
1. Read ONLY what is visibly present on the chart screenshot.
2. Try to detect:
   - pair or instrument
   - current visible price
   - timeframe if visible
   - bullish or bearish structure
   - possible entry, stop loss, take profit
3. If something is not clearly visible, return null for that field.
4. Do NOT invent exact chart values you cannot see.
5. Keep reasoning short and realistic.
6. Return STRICT JSON only. No markdown. No code block. No extra text.

Return this exact JSON shape:
{
  "direction": "BUY or SELL or null",
  "pair": "string or null",
  "timeframe": "string or null",
  "currentPrice": "string or null",
  "entry": "string or null",
  "takeProfit": "string or null",
  "stopLoss": "string or null",
  "confidence": "Low or Medium or High",
  "riskReward": "string or null",
  "summary": "short summary",
  "reasoning": "short explanation based only on visible chart features"
}
`.trim();

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt,
              },
              {
                type: "input_image",
                image_url: dataUrl,
                detail: "high",
              },
            ],
          },
        ],
      }),
    });

    const raw = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(openaiResponse.status).json({
        error: raw?.error?.message || "OpenAI request failed",
        raw,
      });
    }

    const textOutput = extractTextOutput(raw);

    if (!textOutput) {
      return res.status(500).json({
        error: "No text output returned from OpenAI",
        raw,
      });
    }

    const parsed = safeParseJson(textOutput);

    if (!parsed) {
      return res.json({
        result: textOutput,
        structured: null,
        raw,
      });
    }

    const normalized = normalizeAnalysis(parsed);

    return res.json({
      result: JSON.stringify(normalized, null, 2),
      structured: normalized,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return res.status(500).json({
      error: error.message || "Server error during analysis",
    });
  }
});

function extractTextOutput(apiResponse) {
  if (!apiResponse) return "";

  if (typeof apiResponse.output_text === "string" && apiResponse.output_text.trim()) {
    return apiResponse.output_text.trim();
  }

  if (Array.isArray(apiResponse.output)) {
    const texts = [];

    for (const item of apiResponse.output) {
      if (!item || !Array.isArray(item.content)) continue;

      for (const part of item.content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          texts.push(part.text);
        }
      }
    }

    if (texts.length) {
      return texts.join("\n").trim();
    }
  }

  return "";
}

function safeParseJson(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch {
    // try to recover if model wrapped JSON with extra text
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const maybeJson = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeJson);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeAnalysis(data) {
  const direction = normalizeDirection(data.direction);

  return {
    direction,
    pair: cleanValue(data.pair),
    timeframe: cleanValue(data.timeframe),
    currentPrice: cleanValue(data.currentPrice),
    entry: cleanValue(data.entry),
    takeProfit: cleanValue(data.takeProfit),
    stopLoss: cleanValue(data.stopLoss),
    confidence: normalizeConfidence(data.confidence),
    riskReward: cleanValue(data.riskReward),
    summary: cleanText(data.summary),
    reasoning: cleanText(data.reasoning),
  };
}

function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeDirection(value) {
  const str = String(value || "").trim().toUpperCase();
  if (str.includes("BUY")) return "BUY";
  if (str.includes("SELL")) return "SELL";
  return null;
}

function normalizeConfidence(value) {
  const str = String(value || "").trim().toLowerCase();

  if (str === "low") return "Low";
  if (str === "medium") return "Medium";
  if (str === "high") return "High";

  return "Medium";
}

app.listen(port, () => {
  console.log(`GT FX GOAT AI backend running on port ${port}`);
});
