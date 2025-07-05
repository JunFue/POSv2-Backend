const express = require("express");
const { Pool } = require("pg");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Use the same database connection pool as your other route files
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// GET /api/cashouts - Fetches records for the logged-in user
router.get("/cashout", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { date, startDate, endDate } = req.query;

  let queryText;
  let queryParams;

  if (date) {
    // Fetch for a single date
    queryText =
      "SELECT * FROM cashouts WHERE user_id = $1 AND cashout_date::date = $2 ORDER BY created_at DESC";
    queryParams = [userId, date];
  } else if (startDate && endDate) {
    // Fetch for a date range
    queryText =
      "SELECT * FROM cashouts WHERE user_id = $1 AND cashout_date::date BETWEEN $2 AND $3 ORDER BY created_at DESC";
    queryParams = [userId, startDate, endDate];
  } else {
    return res
      .status(400)
      .json({ error: "Please provide a date or a date range." });
  }

  try {
    const { rows } = await pool.query(queryText, queryParams);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching cashouts:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/cashouts - Creates a new cashout record
router.post("/cashout", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  // Note: The frontend will need to send 'cashout_date' in the body
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
    // Return the newly created record, which includes the database-generated ID
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting cashout:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/cashouts/:id - Deletes a specific cashout record
router.delete("/cashout/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const deleteQuery = `
        DELETE FROM cashouts
        WHERE id = $1 AND user_id = $2
        RETURNING *;
    `;
  const values = [id, userId];

  try {
    const result = await pool.query(deleteQuery, values);
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Record not found or you do not have permission to delete it.",
      });
    }
    res.status(200).json({ message: "Record deleted successfully." });
  } catch (error) {
    console.error("Error deleting cashout:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
