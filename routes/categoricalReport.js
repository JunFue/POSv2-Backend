const express = require("express");
const router = express.Router();
// Import your configured Supabase client from your config folder
const supabase = require("../config/supabaseClient");
// Import your authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @route   POST /api/categorical-report/daily-sales
 * @desc    Get the total sales for a specific classification for the authenticated user and a given date.
 * @access  Private
 * @body    {
 * "date": "YYYY-MM-DD",
 * "category": "YourClassification"
 * }
 */
router.post("/daily-sales", authMiddleware, async (req, res) => {
  // 1. Destructure the required parameters from the request body.
  // The user_id is now taken from the authenticated user session for security.
  const { date, category } = req.body;
  const user_id = req.user.id;

  // 2. Validate that all required parameters have been sent from the frontend.
  if (!date || !category) {
    return res.status(400).json({
      error: "Missing required parameters. Please provide date and category.",
    });
  }

  try {
    // 3. Call the Supabase RPC function using the user-specific Supabase client from the middleware.
    // This ensures Row Level Security policies are applied correctly.
    const { data, error } = await req.supabase.rpc(
      "get_daily_sales_by_classification",
      {
        p_date: date,
        p_classification: category,
        p_user_id: user_id,
      }
    );

    // 4. Handle any errors that the database function returns.
    if (error) {
      console.error("Supabase RPC error:", error.message);
      return res.status(500).json({
        error: "Failed to fetch sales data from the database.",
        details: error.message,
      });
    }

    // 5. If the call is successful, send the data back to the frontend.
    res.status(200).json({ totalSales: data });
  } catch (err) {
    // Catch any other unexpected server errors.
    console.error("Server error:", err.message);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Export the router so it can be used in your main server file (e.g., index.js)
module.exports = router;
