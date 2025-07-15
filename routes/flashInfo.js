const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { supabase } = require("../config/supabaseClient");

/**
 * @route   GET /api/flash-info/today
 * @desc    Get total sales for a specific date for the logged-in user.
 * @access  Private
 */
router.get("/flash-info/today", authMiddleware, async (req, res) => {
  const { date } = req.query;
  // The authMiddleware adds the 'user' object to the request.
  const userId = req.user.id;

  console.log(
    `FlashInfo Route: Received date query: ${date} for user: ${userId}`
  );

  if (!date) {
    return res
      .status(400)
      .json({ error: 'Query parameter "date" is required.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Please use YYYY-MM-DD." });
  }

  try {
    // --- FIX ---
    // Call the database function, now passing both the date and the user's ID.
    const { data, error } = await supabase.rpc("get_daily_gross_sales", {
      p_date: date,
      p_user_id: userId,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return res
        .status(500)
        .json({ error: "Failed to execute database function." });
    }

    console.log(`FlashInfo Route: Data from RPC function: ${data}`);

    const totalSales = data;

    res.json({ totalSales });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

module.exports = router;
