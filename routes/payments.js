const express = require("express");
const { Pool } = require("pg");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// GET endpoint (no changes needed here)
router.get("/payments", authMiddleware, async (req, res) => {
  // ... existing GET logic ...
  const { startDate, endDate, transactionNo, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const userId = req.user.id;

  try {
    let queryParams = [];
    let baseQuery = "FROM payments";
    let conditions = [`"user_id" = $${queryParams.length + 1}`];
    queryParams.push(userId);

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
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    const countQueryText = `SELECT COUNT(*) ${baseQuery}`;
    const totalCountResult = await pool.query(countQueryText, queryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

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

// POST endpoint to save a payment record
router.post("/payments", authMiddleware, async (req, res) => {
  // --- ADDED FOR DEBUGGING: Log the received request body ---
  console.log("Backend: Received payment data on /api/payments:", req.body);

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

  const insertQuery = `
    INSERT INTO payments (
      transaction_date, transaction_number, customer_name, amount_to_pay, 
      amount_rendered, discount, change, in_charge, user_id
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
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
