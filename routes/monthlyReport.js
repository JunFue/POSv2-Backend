const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ msg: "Please provide a start and end date." });
  }

  try {
    // Query 1: Fetch Transactions
    const transactionsQuery = pool.query(
      `SELECT id, "itemName", price, quantity, "totalPrice", "transactionDate", classification
       FROM transactions 
       WHERE user_id = $1 AND "transactionDate" >= $2 AND "transactionDate" <= $3`,
      [userId, startDate, endDate]
    );

    // Query 2: Fetch Cashouts
    const cashoutsQuery = pool.query(
      `SELECT id, classification, amount, notes, cashout_date, category
       FROM cashouts 
       WHERE user_id = $1 AND cashout_date >= $2 AND cashout_date <= $3`,
      [userId, startDate, endDate]
    );

    // --- NEW Query 3: Fetch Payments ---
    const paymentsQuery = pool.query(
      `SELECT id, transaction_date, amount_to_pay, discount, net_amount
       FROM payments
       WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3`,
      [userId, startDate, endDate]
    );

    // --- Execute all three queries concurrently ---
    const [transactionsResult, cashoutsResult, paymentsResult] =
      await Promise.all([
        transactionsQuery,
        cashoutsQuery,
        paymentsQuery, // Add new query to the execution
      ]);

    // --- Send the combined data as a response ---
    res.json({
      transactions: transactionsResult.rows,
      cashouts: cashoutsResult.rows,
      payments: paymentsResult.rows, // Add new data to the response
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
