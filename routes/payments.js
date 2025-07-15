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

// We will export a function that takes 'io' as an argument
module.exports = function (io) {
  // GET endpoint (no changes needed here)
  router.get("/payments", authMiddleware, async (req, res) => {
    const {
      startDate,
      endDate,
      transactionNo,
      page = 1,
      limit = 10,
    } = req.query;
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
  // POST endpoint to save a payment record
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
      return res
        .status(400)
        .json({ error: "Missing required payment fields." });
    }

    // --- FIX: Calculate the net_amount ---
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
      netAmount, // Add the calculated net amount to the values array
    ];

    try {
      const result = await pool.query(insertQuery, values);

      console.log("Emitting 'payment_update' event to clients.");
      io.emit("payment_update", {
        message: "A new payment has been recorded.",
      });

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

  return router;
};
