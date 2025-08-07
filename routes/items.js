// File: routes/items.js
const express = require("express");
const { Pool } = require("pg");
// The 'node-fetch' dependency is no longer needed
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
    console.error(`[ERROR] GET /items: `, error);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /item-reg (Simplified: Broadcast logic removed)
router.post("/item-reg", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { barcode, name, price, packaging, category } = req.body;

  if (!barcode || !name || !price || !packaging || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Insert the item into the database
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [barcode, name, price, packaging, category, userId]
    );
    const savedItem = result.rows[0];
    console.log("[API /item-reg] Database insertion successful.");

    // 2. Respond to the frontend. No more broadcasting from here.
    res.status(201).json(savedItem);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "An item with this barcode or name already exists." });
    }
    console.error(
      "[API /item-reg] An error occurred during database operation:",
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /item-delete (Simplified: Broadcast logic removed)
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

    console.log("[API /item-delete] Database deletion successful.");

    res.json({
      status: "Item deleted successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error(`[ERROR] DELETE /item-delete: `, error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
