// File: routes/items.js
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

// GET /items (No changes needed here)
router.get("/items", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch items for user ${userId} from PostgreSQL: `,
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// POST /item-reg (Updated)
router.post("/item-reg", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { barcode, name, price, packaging, category } = req.body;

  if (!barcode || !name || !price || !packaging || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [barcode, name, price, packaging, category, userId]
    );

    // The database trigger now handles broadcasting automatically.
    // The client now expects the newly created item in the response
    // to update its status from "pending" to "synced".
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(
      `[ERROR] Failed to insert item ${barcode} into PostgreSQL: `,
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /item-delete (Updated)
router.delete("/item-delete/:barcode", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { barcode } = req.params;

  if (!barcode) {
    return res.status(400).json({ error: "Missing barcode" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM items WHERE barcode = $1 AND user_id = $2 RETURNING *",
      [barcode, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found or access denied" });
    }

    // The database trigger now handles broadcasting automatically.
    res.json({
      status: "Item deleted successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error(
      `[ERROR] Failed to delete item ${barcode} from PostgreSQL: `,
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
