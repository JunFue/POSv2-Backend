const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// GET endpoint to fetch transactions for the logged-in user
router.get("/transactions", authMiddleware, async (req, res) => {
  const { startDate, endDate, transactionNo, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const userId = req.user.id;

  try {
    let queryParams = [];
    let baseQuery = "FROM transactions";
    let conditions = [`"user_id" = $${queryParams.length + 1}`];
    queryParams.push(userId);

    if (transactionNo) {
      conditions.push(`"transactionNo" = $${queryParams.length + 1}`);
      queryParams.push(transactionNo);
    } else if (startDate && endDate) {
      conditions.push(
        `"transactionDate" BETWEEN $${queryParams.length + 1} AND $${
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

    const dataQueryText = `SELECT * ${baseQuery} ORDER BY "transactionDate" DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit, 10), offset);

    const { rows } = await pool.query(dataQueryText, queryParams);
    res.json({ data: rows, totalCount });
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    res
      .status(500)
      .json({ error: "Database error while fetching transactions" });
  }
});

// POST endpoint to record a transaction for the logged-in user
router.post("/transactions", authMiddleware, async (req, res) => {
  // --- Add this console.log to see the incoming data ---

  const userId = req.user.id;
  const {
    barcode,
    itemName,
    price,
    quantity,
    totalPrice,
    transactionDate,
    transactionNo,
    inCharge,
    costumerName,
    classification,
  } = req.body;

  if (
    !barcode ||
    !itemName ||
    price === undefined ||
    !quantity ||
    !totalPrice ||
    !transactionNo ||
    !inCharge
  ) {
    return res
      .status(400)
      .json({ error: "Missing required transaction fields" });
  }

  const insertQuery = `
        INSERT INTO transactions (
          "barcode", "itemName", "price", "quantity", "totalPrice", 
          "transactionDate", "transactionNo", "inCharge", "costumerName", "classification", "user_id"
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *;`;

  const values = [
    barcode,
    itemName,
    price,
    quantity,
    totalPrice,
    transactionDate,
    transactionNo,
    inCharge,
    costumerName,
    classification,
    userId,
  ];

  try {
    const result = await pool.query(insertQuery, values);
    res.status(201).json({
      message: "Transaction recorded successfully",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting transaction into database: ", error);
    res.status(500).json({
      error: "Database error occurred while recording the transaction",
    });
  }
});

router.get("/by-date", authMiddleware, async (req, res) => {
  const { date } = req.query;
  const userId = req.user.id;

  if (!date) {
    return res.status(400).json({ error: "Missing 'date' query parameter" });
  }

  try {
    const queryText = `
      SELECT * FROM transactions
      WHERE "user_id" = $1
        AND "transactionDate"::timestamp >= $2::date
        AND "transactionDate"::timestamp < ($2::date + INTERVAL '1 day')
      ORDER BY "transactionDate" DESC;
    `;

    const values = [userId, date];

    const result = await pool.query(queryText, values);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("Error fetching transactions by date:", err);
    res
      .status(500)
      .json({ error: "Database error while fetching transactions by date" });
  }
});

module.exports = router;
