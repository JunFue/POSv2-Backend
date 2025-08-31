// File: routes/categoricalReport.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// --- REVISION ---
// Apply the authentication middleware to all routes in this file.
router.use(authMiddleware);

/**
 * GET /api/categorical-sales
 * Fetches daily sales for a classification. This route is now protected.
 * The full path is determined by how this router is used in index.js
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
    // Use the user-specific Supabase client attached by the authMiddleware.
    const supabase = req.supabase;

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
