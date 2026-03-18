export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
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

    return res.status(200).json(random);
  } catch (error) {
    return res.status(500).json({
      message: "Server analysis failed."
    });
  }
}
