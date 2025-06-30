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

// --- REVISED: GET endpoint to fetch transactions for the logged-in user ---
router.get("/transactions", authMiddleware, async (req, res) => {
  const { startDate, endDate, transactionNo, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  // --- 1. Get the user's ID from the middleware ---
  const userId = req.user.id;

  try {
    let queryParams = [];
    let baseQuery = "FROM transactions";
    // --- 2. Always filter by the logged-in user's ID first ---
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

    // Pass the same parameters to the count query
    const countQueryText = `SELECT COUNT(*) ${baseQuery}`;
    const totalCountResult = await pool.query(countQueryText, queryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    // Add pagination parameters for the data query
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

// --- REVISED: POST endpoint to record a transaction for the logged-in user ---
router.post("/transactions", authMiddleware, async (req, res) => {
  // --- 3. Get the user's ID from the middleware ---
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
    costumer,
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

  // --- 4. Add user_id to the INSERT query ---
  const insertQuery = `
        INSERT INTO transactions (
          "barcode", "itemName", "price", "quantity", "totalPrice", 
          "transactionDate", "transactionNo", "inCharge", "costumer", "classification", "user_id"
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
    costumer,
    classification,
    userId, // Add userId to the values array
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

module.exports = router;
