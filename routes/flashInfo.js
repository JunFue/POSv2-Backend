const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { supabase } = require("../config/supabaseClient");

console.log("[ROUTER LOG] flashInfo.js router file loaded by Node.");

// Endpoint for Today's Gross Sales
router.get("/today-gross-sales", authMiddleware, async (req, res) => {
  // --- DEBUG LOG ---
  console.log(
    `[ROUTER LOG] ==> Successfully matched route: GET /api/flash-info/today-gross-sales`
  );

  const { date } = req.query;
  const userId = req.user.id;

  if (!date)
    return res
      .status(400)
      .json({ error: 'Query parameter "date" is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res
      .status(400)
      .json({ error: "Invalid date format. Please use YYYY-MM-DD." });

  try {
    const { data, error } = await supabase.rpc("get_daily_gross_sales", {
      p_date: date,
      p_user_id: userId,
    });
    if (error) throw error;
    res.json({ totalSales: data });
  } catch (error) {
    console.error("Error fetching gross sales:", error);
    res.status(500).json({ error: "Failed to fetch gross sales." });
  }
});

// Endpoint for Today's Daily Income (Net)
router.get("/today-daily-income", authMiddleware, async (req, res) => {
  // --- DEBUG LOG ---
  console.log("[ROUTER LOG] Matched route: GET /today-daily-income");

  const { date } = req.query;
  const userId = req.user.id;

  if (!date)
    return res
      .status(400)
      .json({ error: 'Query parameter "date" is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res
      .status(400)
      .json({ error: "Invalid date format. Please use YYYY-MM-DD." });

  try {
    const { data, error } = await supabase.rpc("get_daily_net_income", {
      p_date: date,
      p_user_id: userId,
    });
    if (error) throw error;
    res.json({ totalNetIncome: data });
  } catch (error) {
    console.error("Error fetching daily income:", error);
    res.status(500).json({ error: "Failed to fetch daily income." });
  }
});

// Endpoint for Today's Daily Expenses
router.get("/today-daily-expenses", authMiddleware, async (req, res) => {
  // --- DEBUG LOG ---
  console.log("[ROUTER LOG] Matched route: GET /today-daily-expenses");

  const { date } = req.query;
  const userId = req.user.id;

  if (!date)
    return res
      .status(400)
      .json({ error: 'Query parameter "date" is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res
      .status(400)
      .json({ error: "Invalid date format. Please use YYYY-MM-DD." });

  try {
    const { data, error } = await supabase.rpc("get_daily_expenses", {
      p_date: date,
      p_user_id: userId,
    });
    if (error) throw error;
    res.json({ totalExpenses: data });
  } catch (error) {
    console.error("Error fetching daily expenses:", error);
    res.status(500).json({ error: "Failed to fetch daily expenses." });
  }
});

// --- NEW ENDPOINT for Monthly Income Range ---
router.get("/net-income-range", authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({
        error: "Both startDate and endDate query parameters are required.",
      });
  }

  try {
    const { data, error } = await supabase.rpc("get_net_income_for_range", {
      p_start_date: startDate,
      p_end_date: endDate,
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching net income for range:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch net income for range." });
    }

    res.json({ totalNetIncome: data });
  } catch (error) {
    console.error("Server error in /net-income-range:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

module.exports = router;
