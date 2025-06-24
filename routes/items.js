const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

// Setup PostgreSQL connection pool
// You can also share the pool connection from server.js if you export it there
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// GET endpoint for fetching all items from PostgreSQL
router.get("/items", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching items from PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// POST endpoint for inserting items into your PostgreSQL database
router.post("/item-reg", async (req, res) => {
  const { barcode, name, price, packaging, category } = req.body;
  if (!barcode || !name || !price || !packaging || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const existingItems = await pool.query(
      "SELECT * FROM items WHERE barcode = $1 OR name = $2",
      [barcode, name]
    );
    if (existingItems.rows.length > 0) {
      return res.status(400).json({ error: "Item or barcode already exists" });
    }
  } catch (error) {
    console.error("Error checking duplicate items:", error);
    return res.status(500).json({ error: "Database error" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [barcode, name, price, packaging, category]
    );
    return res.json({
      status: "Item registered successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting item into PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE endpoint for deleting an item from PostgreSQL
router.delete("/item-delete/:barcode", async (req, res) => {
  const { barcode } = req.params;
  if (!barcode) {
    return res.status(400).json({ error: "Missing barcode" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM items WHERE barcode = $1 RETURNING *",
      [barcode]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
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
