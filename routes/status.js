const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

/**
 * A helper function to update the global timestamp in the database.
 * This is exported so other routes can call it after they modify data.
 */
const updateTimestamp = async () => {
  const now = new Date().toISOString();
  try {
    await pool.query(
      `INSERT INTO app_status (id, last_updated_at)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET last_updated_at = $1;`,
      [now]
    );
    console.log(`[OK] Timestamp updated in database to: ${now}`);
  } catch (error) {
    console.error("Error updating timestamp in database:", error);
  }
};

/**
 * GET /api/status/stocks
 * This is the endpoint your frontend calls to check for changes.
 */
router.get("/stocks", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT last_updated_at FROM app_status WHERE id = 1"
    );
    if (result.rows.length === 0) {
      // This case handles the very first run if the table is empty.
      const newTimestamp = await updateTimestamp();
      return res.json({ lastUpdatedAt: newTimestamp });
    }
    res.json({ lastUpdatedAt: result.rows[0].last_updated_at });
  } catch (error) {
    console.error("Error fetching app status:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = { router, updateTimestamp };
