import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer();

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const imageBase64 = req.file.buffer.toString("base64");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `You are a professional Smart Money Concepts trader.

Analyze this chart screenshot and return:

- Direction (BUY or SELL)
- Entry price
- Stop Loss
- Take Profit
- Confidence (Low/Medium/High)
- Short explanation

Be consistent and realistic.`
              },
              {
                type: "input_image",
                image_base64: imageBase64
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    res.json({ result: data.output[0].content[0].text });

  } catch (err) {
    res.status(500).json({ error: "AI failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
