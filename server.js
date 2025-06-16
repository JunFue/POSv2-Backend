const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg"); // Require pg and use Pool

const app = express();
const PORT = process.env.PORT || 3000;

// Setup PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// Define file path to store items data (if needed)
const dataFilePath = path.join(__dirname, "data", "items.json");

// GET endpoint for fetching all items from PostgreSQL
app.get("/api/items", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items ORDER BY created_at DESC"
    );
    res.json(result.rows); // Send the array of items back as JSON
  } catch (error) {
    console.error("Error fetching items from PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// POST endpoint for inserting items into your PostgreSQL database
app.post("/api/item-reg", async (req, res) => {
  console.log("Received /api/item-reg data:", req.body);
  // Validate incoming data
  const { barcode, name, price, packaging, category } = req.body;
  if (!barcode || !name || !price || !packaging || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check if the barcode or name already exists in the database
  try {
    const existingItems = await pool.query(
      "SELECT * FROM items WHERE barcode = $1 OR name = $2",
      [barcode, name]
    );
    if (existingItems.rows.length > 0) {
      return res.status(400).json({ error: "Item or barcode already exists" });
    }
  } catch (error) {
    console.error("Error checking duplicate items:", error);
    return res.status(500).json({ error: "Database error" });
  }

  // Proceed to insert the new item if no duplicate is found
  try {
    const result = await pool.query(
      "INSERT INTO items (barcode, name, price, packaging, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [barcode, name, price, packaging, category]
    );
    console.log("Item inserted in the database:", result.rows[0]); // Log to terminal
    return res.json({
      status: "Item registered successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting item into PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE endpoint for deleting an item from PostgreSQL
app.delete("/api/item-delete/:barcode", async (req, res) => {
  // Get the barcode from the route parameters
  const { barcode } = req.params;

  if (!barcode) {
    return res.status(400).json({ error: "Missing barcode" });
  }

  try {
    // Delete the item from the database and return the deleted row
    const result = await pool.query(
      "DELETE FROM items WHERE barcode = $1 RETURNING *",
      [barcode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    console.log("Item deleted from the database:", result.rows[0]);
    return res.json({
      status: "Item deleted successfully in PostgreSQL",
      item: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting item from PostgreSQL: ", error);
    res.status(500).json({ error: "Database error" });
  }
});

// UPDATED: GET endpoint for fetching transactions with pagination and date range filtering
app.get("/api/transactions", async (req, res) => {
  console.log("GET /api/transactions request received");
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

    // Execute both queries
    const totalCountResult = await pool.query(countQueryText, countQueryParams);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    const { rows } = await pool.query(dataQueryText, queryParams);

    console.log("Response content for GET /api/transactions:", {
      data: rows,
      totalCount,
    });
    res.json({ data: rows, totalCount });
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    res
      .status(500)
      .json({ error: "Database error while fetching transactions" });
  }
});

/**
 * POST endpoint for recording a new transaction.
 * Expects a JSON body with the transaction details.
 */
app.post("/api/transactions", async (req, res) => {
  console.log("Received /api/transactions data:", req.body);
  // 1. Destructure all expected fields from the request body
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

  // 2. Validate that essential fields are provided
  if (
    !barcode ||
    !itemName ||
    price === undefined || // Check for undefined since price could be 0
    !quantity ||
    !totalPrice ||
    !transactionNo ||
    !inCharge
  ) {
    return res
      .status(400)
      .json({ error: "Missing required transaction fields" });
  }

  // 3. Construct the parameterized SQL query with corrected, double-quoted column names
  const insertQuery = `
        INSERT INTO transactions (
          "barcode", "itemName", "price", "quantity", "totalPrice", 
          "transactionDate", "transactionNo", "inCharge", "costumer", "classification"
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *; 
      `;

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

  // 4. Execute the query in a try...catch block
  try {
    const result = await pool.query(insertQuery, values);

    // Log success and send back the newly created row
    console.log("Transaction recorded successfully:", result.rows[0]);
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

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
