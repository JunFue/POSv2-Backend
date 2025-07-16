const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { supabase } = require("../config/supabaseClient");

// Endpoint to get all cashout records for a single day
router.get("/cashouts-by-date", authMiddleware, async (req, res) => {
  const { date } = req.query;
  const userId = req.user.id;

  if (!date)
    return res.status(400).json({ error: "Date parameter is required." });

  try {
    // --- FIX: Query for a date range covering the entire day ---
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from("cashouts")
      .select("*")
      .eq("user_id", userId)
      .gte("cashout_date", startDate) // Greater than or equal to the start of the day
      .lte("cashout_date", endDate); // Less than or equal to the end of the day

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching cashouts by date:", error);
    res.status(500).json({ error: "Failed to fetch daily cashouts." });
  }
});

// Endpoint for total expenses in a date range
router.get("/total-expenses-range", authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  if (!startDate || !endDate)
    return res.status(400).json({ error: "Start and end dates are required." });

  try {
    const { data, error } = await supabase.rpc("get_total_expenses_for_range", {
      p_start_date: startDate,
      p_end_date: endDate,
      p_user_id: userId,
    });
    if (error) throw error;
    res.json({ totalExpenses: data });
  } catch (error) {
    console.error("Error fetching total expenses for range:", error);
    res.status(500).json({ error: "Failed to fetch total expenses." });
  }
});

// Endpoint for expense breakdown by category in a date range
router.get("/expense-breakdown-range", authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  if (!startDate || !endDate)
    return res.status(400).json({ error: "Start and end dates are required." });

  try {
    const { data, error } = await supabase.rpc(
      "get_expense_breakdown_for_range",
      {
        p_start_date: startDate,
        p_end_date: endDate,
        p_user_id: userId,
      }
    );
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching expense breakdown:", error);
    res.status(500).json({ error: "Failed to fetch expense breakdown." });
  }
});

module.exports = router;
