const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { supabase } = require("../config/supabaseClient");

// Endpoint for Today's Gross Sales
router.get(
  "/flash-info/today-gross-sales",
  authMiddleware,
  async (req, res) => {
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
  }
);

// --- NEW ENDPOINT ---
// Endpoint for Today's Daily Income (Net)
router.get(
  "/flash-info/today-daily-income",
  authMiddleware,
  async (req, res) => {
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
  }
);

module.exports = router;
