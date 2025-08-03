const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// --- PERSISTENT TIMESTAMP LOGIC (CommonJS version) ---
// In CommonJS, __dirname is a global variable that works correctly without any special imports.
const timestampFilePath = path.join(__dirname, "timestamp.log");

// Function to read the last known timestamp from the file.
const readTimestamp = () => {
  try {
    if (fs.existsSync(timestampFilePath)) {
      const timestampStr = fs.readFileSync(timestampFilePath, "utf8");
      return parseInt(timestampStr, 10);
    }
  } catch (err) {
    console.error("Error reading timestamp file:", err);
  }
  // This will only run on the very first server start.
  const now = Date.now();
  console.log(
    `Timestamp file not found. Initializing with current time: ${now}`
  );
  writeTimestamp(now); // Create the file immediately
  return now;
};

// Function to write the new timestamp to the file for persistence.
const writeTimestamp = (timestamp) => {
  try {
    fs.writeFileSync(timestampFilePath, timestamp.toString(), "utf8");
  } catch (err) {
    console.error("Error writing timestamp file:", err);
  }
};

// Initialize the timestamp from our persistent source (the file).
let lastStockUpdateTimestamp = readTimestamp();
// --- END OF PERSISTENT TIMESTAMP LOGIC ---

/**
 * Webhook Endpoint for Supabase.
 * When the database changes, this is called.
 */
router.post("/webhooks/stocks-updated", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Webhook received: Stocks table was updated.`
  );

  // Update the timestamp in memory AND write it to the persistent file.
  lastStockUpdateTimestamp = Date.now();
  writeTimestamp(lastStockUpdateTimestamp);

  res.status(200).json({
    message: "Notification received successfully.",
    newTimestamp: lastStockUpdateTimestamp,
  });
});

/**
 * Status Endpoint for the Frontend.
 * Provides the timestamp of the last known stock data modification.
 */
router.get("/status/stocks", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Frontend is checking stock status.`
  );
  // Return the reliable, persistent timestamp.
  res.status(200).json({
    lastUpdatedAt: lastStockUpdateTimestamp,
  });
});

// --- Use CommonJS export syntax to match the rest of the project ---
module.exports = router;
