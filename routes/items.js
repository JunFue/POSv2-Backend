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

// --- REVISED: Get items for the logged-in user ---
router.get("/items", authMiddleware, async (req, res) => {
  // Get the logged-in user's ID from the middleware
  const userId = req.user.id;

  try {
    // Add a WHERE clause to only select items matching the user's ID
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

// --- REVISED: Register an item for the logged-in user ---
router.post("/item-reg", authMiddleware, async (req, res) => {
  // Get the logged-in user's ID from the middleware
  const userId = req.user.id;
  const { barcode, name, price, packaging, category } = req.body;

  // --- DEBUGGING LOGS ADDED ---
  console.log("--- New Item Registration Request ---");
  console.log("Received User ID:", userId);
  console.log("Received Request Body:", req.body);
  // --- END OF DEBUGGING LOGS ---

  if (!barcode || !name || !price || !packaging || !category) {
    console.log("Validation Failed: Missing required fields."); // Added log for validation failure
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Modify the INSERT query to include the user_id
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [barcode, name, price, packaging, category, userId]
    );
    return res.json({
      status: "Item registered successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    // This will now log the detailed PostgreSQL error to your backend console
    console.error("Error inserting item into PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// --- REVISED: Delete an item only if it belongs to the logged-in user ---
router.delete("/item-delete/:barcode", authMiddleware, async (req, res) => {
  // Get the logged-in user's ID from the middleware
  const userId = req.user.id;
  const { barcode } = req.params;

  if (!barcode) {
    return res.status(400).json({ error: "Missing barcode" });
  }
  try {
    // Add a WHERE clause to ensure the user can only delete their own item
    const result = await pool.query(
      "DELETE FROM items WHERE barcode = $1 AND user_id = $2 RETURNING *",
      [barcode, userId]
    );
    if (result.rowCount === 0) {
      // This can mean the item doesn't exist OR the user doesn't own it
      return res.status(404).json({ error: "Item not found or access denied" });
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
