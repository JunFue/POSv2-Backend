// File: routes/categoricalReport.js

const express = require("express");
const router = express.Router();
// We no longer need to import the global supabase client here.
// const supabase = require('../config/supabaseClient');

/**
 * GET /api/categorical-sales
 * Fetches daily sales for a classification. This route is protected by authMiddleware.
 */
router.get("/categorical-sales", async (req, res) => {
  console.log("GET /api/categorical-sales endpoint hit");
  console.log("Received query parameters:", req.query);

  const { date, classification, userId } = req.query;

  if (!date || !classification || !userId) {
    return res.status(400).json({
      error: "Bad Request: Missing required query parameters.",
    });
  }

  try {
    // --- FIX ---
    // Use the user-specific Supabase client attached by the authMiddleware.
    const supabase = req.supabase;

    // Add a check to ensure the middleware has run correctly.
    if (!supabase) {
      console.error(
        "Server Configuration Error: User-specific Supabase client not found on request object. Is authMiddleware applied correctly?"
      );
      return res.status(500).json({ error: "Server configuration error." });
    }

    console.log(
      "Calling Supabase RPC 'get_daily_sales_by_classification' with:",
      { p_date: date, p_classification: classification, p_user_id: userId }
    );

    const { data, error } = await supabase.rpc(
      "get_daily_sales_by_classification",
      {
        p_date: date,
        p_classification: classification,
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Supabase RPC Error:", error.message);
      return res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }

    console.log("Sending successful response with totalSales:", data);
    res.status(200).json({ totalSales: data });
  } catch (err) {
    console.error("API Route Error:", err.message);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

module.exports = router;
