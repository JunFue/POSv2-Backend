const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

// Setup PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

// GET endpoint for fetching transactions with pagination and date range filtering
router.get("/transactions", async (req, res) => {
  const { startDate, endDate, transactionNo, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    let countQueryText;
    let dataQueryText;
    let queryParams = [];
    let countQueryParams = [];
    let baseQuery = "FROM transactions";
    let conditions = [];

    if (transactionNo) {
      conditions.push(`"transactionNo" = $${queryParams.length + 1}`);
      queryParams.push(transactionNo);
      countQueryParams.push(transactionNo);
    } else if (startDate && endDate) {
      conditions.push(
        `"transactionDate" BETWEEN $${queryParams.length + 1} AND $${
          queryParams.length + 2
        }`
      );
      queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      countQueryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    countQueryText = `SELECT COUNT(*) ${baseQuery}`;
    dataQueryText = `SELECT * ${baseQuery} ORDER BY "transactionDate" DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit, 10), offset);

    const totalCountResult = await pool.query(countQueryText, countQueryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);
    const { rows } = await pool.query(dataQueryText, queryParams);
    res.json({ data: rows, totalCount });
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    res
      .status(500)
      .json({ error: "Database error while fetching transactions" });
  }
});

// POST endpoint for recording a new transaction
router.post("/transactions", async (req, res) => {
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

  const insertQuery = `
        INSERT INTO transactions (
          "barcode", "itemName", "price", "quantity", "totalPrice", 
          "transactionDate", "transactionNo", "inCharge", "costumer", "classification"
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
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
  ];

  try {
    const result = await pool.query(insertQuery, values);
    res.status(201).json({
      message: "Transaction recorded successfully",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting transaction into database: ", error);
    res
      .status(500)
      .json({
        error: "Database error occurred while recording the transaction",
      });
  }
});

module.exports = router;
