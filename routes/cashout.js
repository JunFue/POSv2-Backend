const express = require("express");
const { Pool } = require("pg");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// We will export a function that takes 'io' as an argument
module.exports = function (io) {
  // GET /api/cashouts - Fetches records for the logged-in user
  router.get("/cashout", authMiddleware, async (req, res) => {
    // ... existing GET logic from your file ...
  });

  // POST /api/cashouts - Creates a new cashout record
  router.post("/cashout", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { category, amount, notes, receiptNo, cashout_date } = req.body;

    if (!category || amount === undefined || !cashout_date) {
      return res
        .status(400)
        .json({ error: "Category, amount, and date are required." });
    }

    const insertQuery = `
      INSERT INTO cashouts (category, amount, notes, receipt_no, cashout_date, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [category, amount, notes, receiptNo, cashout_date, userId];

    try {
      const result = await pool.query(insertQuery, values);

      // --- ADD THIS ---
      // After successfully saving, emit an event to all connected clients.
      console.log("Emitting 'cashout_update' event to clients.");
      io.emit("cashout_update", {
        message: "A new cashout has been recorded.",
      });

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error inserting cashout:", error);
      res.status(500).json({ error: "Database error" });
    }
  });

  // DELETE /api/cashouts/:id - Deletes a specific cashout record
  router.delete("/cashout/:id", authMiddleware, async (req, res) => {
    // ... existing DELETE logic from your file ...
  });

  return router;
};
