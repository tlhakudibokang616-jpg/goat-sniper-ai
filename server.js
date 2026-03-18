const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage() });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      email
    });
  }

  return res.status(401).json({
    success: false,
    message: "Wrong email or password."
  });
});

app.post("/analyze", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No chart uploaded." });
    }

    const sampleResults = [
      {
        direction: "BUY",
        confidence: "92%",
        entry: "42215.50",
        sl: "42120.00",
        tp: "42410.00",
        pair: "US30"
      },
      {
        direction: "SELL",
        confidence: "89%",
        entry: "2685.20",
        sl: "2692.80",
        tp: "2671.40",
        pair: "XAUUSD"
      },
      {
        direction: "BUY",
        confidence: "87%",
        entry: "1.08420",
        sl: "1.08290",
        tp: "1.08740",
        pair: "EURUSD"
      }
    ];

    const random = sampleResults[Math.floor(Math.random() * sampleResults.length)];

    return res.json(random);
  } catch (error) {
    return res.status(500).json({ message: "Server analysis failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
