// File: routes/items.js
const express = require("express");
const { Pool } = require("pg");
const authMiddleware = require("../middleware/authMiddleware");
const { updateTimestamp, sendUpdateToAllClients } = require("./status");

const router = express.Router();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// GET /items (Updated with logs)
router.get("/items", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  console.log(
    `[DEBUG] GET /items hit for user ${userId}. Fetching from database.`
  );

  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    console.log(
      `[SUCCESS] Found ${result.rows.length} items for user ${userId}.`
    );
    // --- CHANGE: Revised the log to be less verbose ---
    console.log("[DEBUG] Responding successfully to GET /items.");

    res.json(result.rows);
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch items for user ${userId} from PostgreSQL: `,
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// POST /item-reg (Updated with logs)
router.post("/item-reg", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { barcode, name, price, packaging, category } = req.body;

  console.log(
    `[DEBUG] POST /item-reg hit for user ${userId} with barcode ${barcode}`
  );

  if (!barcode || !name || !price || !packaging || !category) {
    console.error("[ERROR] Missing required fields for item registration.");
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [barcode, name, price, packaging, category, userId]
    );

    console.log(`[SUCCESS] Item ${barcode} inserted into database.`);

    console.log("[DEBUG] Calling updateTimestamp...");
    await updateTimestamp();
    console.log("[DEBUG] Calling sendUpdateToAllClients...");
    sendUpdateToAllClients();

    return res.json({
      status: "Item registered successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error(
      `[ERROR] Failed to insert item ${barcode} into PostgreSQL: `,
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /item-delete (Updated with logs)
router.delete("/item-delete/:barcode", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { barcode } = req.params;

  console.log(
    `[DEBUG] DELETE /item-delete hit for user ${userId} with barcode ${barcode}`
  );

  if (!barcode) {
    console.error("[ERROR] Missing barcode for item deletion.");
    return res.status(400).json({ error: "Missing barcode" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM items WHERE barcode = $1 AND user_id = $2 RETURNING *",
      [barcode, userId]
    );
    if (result.rowCount === 0) {
      console.warn(
        `[WARN] Item with barcode ${barcode} not found for user ${userId} to delete.`
      );
      return res.status(404).json({ error: "Item not found or access denied" });
    }

    console.log(`[SUCCESS] Item ${barcode} deleted from database.`);

    console.log("[DEBUG] Calling updateTimestamp...");
    await updateTimestamp();
    console.log("[DEBUG] Calling sendUpdateToAllClients...");
    sendUpdateToAllClients();

    return res.json({
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
