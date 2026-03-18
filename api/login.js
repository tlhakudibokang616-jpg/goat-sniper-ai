export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return res.status(200).json({
        success: true,
        email
      });
    }

    return res.status(401).json({
      success: false,
      message: "Wrong email or password."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server login failed."
    });
  }
}
