const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Create a new router object
const router = express.Router();

// --- CONFIGURATION (IMPORTANT: Fill these in or use environment variables) ---
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-that-is-long";

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "youremail@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-gmail-app-password",
  },
});

const SMS_API_KEY = process.env.SMS_API_KEY || "your-sms-service-api-key";
const SMS_API_SECRET =
  process.env.SMS_API_SECRET || "your-sms-service-api-secret";

// Setup PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// --- HELPER FUNCTIONS ---
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOtp(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER || "youremail@gmail.com",
    to: email,
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP for registration is: ${otp}. It is valid for 10 minutes.`,
  };
  try {
    await mailer.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending OTP email to ${email}:`, error);
    throw new Error("Could not send OTP email.");
  }
}

async function sendSmsOtp(phoneNumber, otp) {
  console.log(`--- SIMULATING SMS ---`);
  console.log(`Sending OTP ${otp} to phone number ${phoneNumber}`);
  return Promise.resolve();
}

// --- AUTHENTICATION ROUTES ---
// Note: The paths are now relative to /api/auth (e.g., /initiate-signup)

router.post("/initiate-signup", async (req, res) => {
  const { method, identifier, password } = req.body;
  if (!method || !identifier) {
    return res
      .status(400)
      .json({ error: "Method (email/phone) and identifier are required." });
  }
  if (method === "phone" && !password) {
    return res
      .status(400)
      .json({ error: "Password is required for phone number signup." });
  }
  try {
    let query =
      method === "email"
        ? "SELECT * FROM users WHERE email = $1"
        : "SELECT * FROM users WHERE phone_number = $1";
    const existingUser = await pool.query(query, [identifier]);
    if (existingUser.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "An account with this identifier already exists." });
    }
    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await pool.query(
      "INSERT INTO otps (identifier, otp_code, expires_at) VALUES ($1, $2, $3)",
      [identifier, otp, expires_at]
    );
    if (method === "email") await sendEmailOtp(identifier, otp);
    else if (method === "phone") await sendSmsOtp(identifier, otp);
    else
      return res
        .status(400)
        .json({ error: "Invalid signup method specified." });
    res.status(200).json({ message: "OTP has been sent successfully." });
  } catch (error) {
    console.error("Error during OTP initiation:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

router.post("/complete-signup", async (req, res) => {
  const { method, identifier, password, otp, accessToken } = req.body;
  if (!method || !identifier || !otp || !accessToken) {
    return res
      .status(400)
      .json({ error: "Identifier, OTP, and Access Token are required." });
  }
  if (method === "phone" && !password) {
    return res
      .status(400)
      .json({ error: "Password is required for phone number signup." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const otpResult = await client.query(
      "SELECT * FROM otps WHERE identifier = $1 AND otp_code = $2 AND expires_at > NOW()",
      [identifier, otp]
    );
    if (otpResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    const tokenResult = await client.query(
      "SELECT * FROM access_tokens WHERE token_value = $1 AND is_used = FALSE",
      [accessToken]
    );
    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Invalid, expired, or already used access token." });
    }
    const tokenId = tokenResult.rows[0].id;
    let newUser;
    if (method === "email") {
      const result = await client.query(
        "INSERT INTO users (email) VALUES ($1) RETURNING *",
        [identifier]
      );
      newUser = result.rows[0];
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const result = await client.query(
        "INSERT INTO users (phone_number, password_hash) VALUES ($1, $2) RETURNING *",
        [identifier, passwordHash]
      );
      newUser = result.rows[0];
    }
    await client.query(
      "UPDATE access_tokens SET is_used = TRUE, user_id = $1 WHERE id = $2",
      [newUser.id, tokenId]
    );
    await client.query("DELETE FROM otps WHERE identifier = $1", [identifier]);
    await client.query("COMMIT");
    res.status(201).json({
      message: "User account created successfully!",
      userId: newUser.id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error during signup completion:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;
  if (!phoneNumber || !password) {
    return res
      .status(400)
      .json({ error: "Phone number and password are required." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phoneNumber]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "Invalid credentials." });
    }
    if (!user.password_hash) {
      return res.status(400).json({
        error: "This account must sign in using another method (e.g., Google).",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }
    const payload = { user: { id: user.id, phone: user.phone_number } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Export the router so it can be used in server.js
module.exports = router;
