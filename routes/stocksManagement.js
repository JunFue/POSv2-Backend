const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware"); // Use the shared middleware

const router = express.Router();

// --- GET ALL STOCK FLOW RECORDS for the authenticated user ---
router.get("/stocks", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const queryText = `
      SELECT * FROM public.stock_flow 
      WHERE "user_id" = $1 
      ORDER BY "created_at" DESC;
    `;
    const { rows } = await pool.query(queryText, [userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("--- ERROR FETCHING STOCK FLOW ---");
    console.error("Full pg error object:", error);
    res.status(500).json({
      error: "Database error while fetching stock flow records.",
      details: error.message,
    });
  }
});

// --- ADD A NEW STOCK FLOW RECORD ---
router.post("/stocks", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { item, packaging, stockFlow, quantity, notes, date } = req.body;

  if (!item || !stockFlow || !quantity) {
    return res
      .status(400)
      .json({ error: "Missing required fields: item, stockFlow, quantity." });
  }

  try {
    const insertQuery = `
      INSERT INTO public.stock_flow (item, packaging, "stockFlow", quantity, notes, date, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const values = [item, packaging, stockFlow, quantity, notes, date, userId];

    const result = await pool.query(insertQuery, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("\n--- [FATAL] ERROR IN POST /STOCKS ---");
    console.error("Full pg error object:", error);
    res.status(500).json({
      error: "An internal server error occurred.",
      details: error.message,
      code: error.code,
    });
  }
});

// --- UPDATE AN EXISTING STOCK FLOW RECORD ---
router.put("/stocks/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { item, packaging, stockFlow, quantity, notes, date } = req.body;

  if (!item || !stockFlow || !quantity) {
    return res
      .status(400)
      .json({ error: "Missing required fields: item, stockFlow, quantity." });
  }

  try {
    const updateQuery = `
      UPDATE public.stock_flow 
      SET item = $1, packaging = $2, "stockFlow" = $3, quantity = $4, notes = $5, date = $6 
      WHERE id = $7 AND "user_id" = $8 
      RETURNING *;
    `;
    const values = [
      item,
      packaging,
      stockFlow,
      quantity,
      notes,
      date,
      id,
      userId,
    ];
    const { rows } = await pool.query(updateQuery, values);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Record not found or user not authorized." });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("--- ERROR UPDATING STOCK FLOW ---");
    console.error("Full pg error object:", error);
    res.status(500).json({
      error: "Failed to update stock flow record.",
      details: error.message,
    });
  }
});

// --- DELETE A STOCK FLOW RECORD ---
router.delete("/stocks/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const deleteQuery = `
      DELETE FROM public.stock_flow 
      WHERE id = $1 AND "user_id" = $2;
    `;
    const result = await pool.query(deleteQuery, [id, userId]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Record not found or user not authorized." });
    }
    res.status(204).send();
  } catch (error) {
    console.error("--- ERROR DELETING STOCK FLOW ---");
    console.error("Full pg error object:", error);
    res.status(500).json({
      error: "Failed to delete stock flow record.",
      details: error.message,
    });
  }
});

module.exports = router;
