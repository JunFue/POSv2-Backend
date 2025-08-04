const express = require("express");
const { Pool } = require("pg");
const authMiddleware = require("../middleware/authMiddleware");
// --- Step 1: Import the updateTimestamp function ---
const { updateTimestamp } = require("./status"); // Adjust path if necessary

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
    console.error("Error fetching items from PostgreSQL: ", error);
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

    // --- Step 2: Update the global timestamp after a successful insert ---
    await updateTimestamp();

    return res.json({
      status: "Item registered successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting item into PostgreSQL: ", error);
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

    // --- Step 2 (cont.): Update the timestamp on delete as well ---
    await updateTimestamp();

    return res.json({
      status: "Item deleted successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting item from PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
