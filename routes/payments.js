// File: routes/payments.js
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/payments", authMiddleware, async (req, res) => {
  const { startDate, endDate, transactionNo, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const userId = req.user.id;

  try {
    let queryParams = [userId];
    let baseQuery = 'FROM payments WHERE "user_id" = $1';
    let conditions = [];

    // Build query conditions based on request parameters
    if (transactionNo) {
      conditions.push(`"transaction_number" = $${queryParams.length + 1}`);
      queryParams.push(transactionNo);
    } else if (startDate && endDate) {
      conditions.push(
        `"transaction_date" BETWEEN $${queryParams.length + 1} AND $${
          queryParams.length + 2
        }`
      );
      queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    if (conditions.length > 0) {
      baseQuery += " AND " + conditions.join(" AND ");
    }

    // --- FIX STARTS HERE ---
    // The original code had a bug in how it sliced queryParams for the count query.
    // This new approach creates a clean copy of the parameters needed for the count,
    // solving the "incorrect number of parameters" error.

    // 1. Create a copy of the parameters for the count query *before* adding pagination params.
    const countQueryParams = [...queryParams];
    const countQueryText = `SELECT COUNT(*) ${baseQuery}`;

    // 2. Execute the count query with the correct parameters.
    const totalCountResult = await pool.query(countQueryText, countQueryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    // --- FIX ENDS HERE ---

    // 3. Now, add the pagination parameters and fetch the actual data.
    const dataQueryText = `SELECT * ${baseQuery} ORDER BY "transaction_date" DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit, 10), offset);

    const { rows } = await pool.query(dataQueryText, queryParams);
    res.json({ data: rows, totalCount });
  } catch (error) {
    console.error("Error fetching payments: ", error);
    res.status(500).json({ error: "Database error while fetching payments" });
  }
});

// The POST endpoint remains unchanged.
router.post("/payments", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    transactionDate,
    transactionNumber,
    costumerName,
    amountToPay,
    amountRendered,
    discount,
    change,
    inCharge,
  } = req.body;

  if (!transactionNumber || !transactionDate || !inCharge) {
    return res.status(400).json({ error: "Missing required payment fields." });
  }

  const netAmount = parseFloat(amountToPay) - parseFloat(discount || 0);

  const insertQuery = `
    INSERT INTO payments (
      transaction_date, transaction_number, customer_name, amount_to_pay,
      amount_rendered, discount, change, in_charge, user_id, net_amount
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    transactionDate,
    transactionNumber,
    costumerName,
    amountToPay,
    amountRendered,
    discount,
    change,
    inCharge,
    userId,
    netAmount,
  ];

  try {
    const result = await pool.query(insertQuery, values);
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting payment into database: ", error);
    res.status(500).json({
      error: "Database error occurred while recording the payment.",
    });
  }
});

module.exports = router;
