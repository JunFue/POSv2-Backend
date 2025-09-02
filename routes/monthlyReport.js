const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware"); // Middleware to get user_id

router.get("/", authMiddleware, async (req, res) => {
  // The user ID is attached to the request by the authMiddleware
  const userId = req.user.id;

  // Dates are received from the query string (e.g., /api/monthly-report?startDate=2025-09-01&endDate=2025-09-30)
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ msg: "Please provide a start and end date." });
  }

  try {
    // --- Query 1: Fetch Transactions ---
    const transactionsQuery = pool.query(
      `SELECT id, "itemName", price, quantity, "totalPrice", "transactionDate", classification
       FROM transactions 
       WHERE user_id = $1 AND "transactionDate" >= $2 AND "transactionDate" <= $3`,
      [userId, startDate, endDate]
    );

    // --- Query 2: Fetch Cashouts ---
    const cashoutsQuery = pool.query(
      `SELECT id, classification, amount, notes, cashout_date, category
       FROM cashouts 
       WHERE user_id = $1 AND cashout_date >= $2 AND cashout_date <= $3`,
      [userId, startDate, endDate]
    );

    // --- Execute both queries concurrently ---
    const [transactionsResult, cashoutsResult] = await Promise.all([
      transactionsQuery,
      cashoutsQuery,
    ]);

    // --- Send the combined data as a response ---
    res.json({
      transactions: transactionsResult.rows,
      cashouts: cashoutsResult.rows,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
