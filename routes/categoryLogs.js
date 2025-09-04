const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/category-logs
// Fetches the pre-calculated daily logs for a specific category and date range.
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { categoryName, startDate, endDate } = req.query;

  if (!categoryName || !startDate || !endDate) {
    return res.status(400).json({ msg: "Missing required query parameters." });
  }

  try {
    const query = `
      SELECT 
        cl.log_date,
        cl.forwarded,
        cl.cash_in,
        cl.cash_out,
        cl.balance
      FROM public.category_logs cl
      JOIN public.categories c ON cl.category_id = c.id
      WHERE cl.user_id = $1
        AND c.name = $2
        AND cl.log_date >= $3
        AND cl.log_date <= $4
      ORDER BY cl.log_date ASC;
    `;
    const { rows } = await pool.query(query, [
      userId,
      categoryName,
      startDate,
      endDate,
    ]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching category logs:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
