import express from "express";

// Initialize a new Express router.
const router = express.Router();

let lastStockUpdateTimestamp = Date.now();

// --- ENDPOINTS ---

/**
 * 1. Webhook Endpoint for Supabase
 *
 * @route POST /api/webhooks/stocks-updated
 * @description Listens for notifications from Supabase that the stocks table has changed.
 * Upon receiving a request, it updates the `lastStockUpdateTimestamp`.
 * @access Public (but should ideally be secured with a secret key shared between Supabase and the backend)
 */
router.post("/webhooks/stocks-updated", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Webhook received: Stocks table was updated.`
  );

  // Update the timestamp to the current time.
  lastStockUpdateTimestamp = Date.now();

  // Respond to the webhook to confirm receipt.
  res.status(200).json({
    message: "Notification received successfully.",
    newTimestamp: lastStockUpdateTimestamp,
  });
});

/**
 * 2. Status Endpoint for the Frontend
 *
 * @route GET /api/status/stocks
 * @description Provides the timestamp of the last known stock data modification.
 * @access Public
 */
router.get("/status/stocks", (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Frontend is checking stock status.`
  );

  // Return the last update timestamp in a JSON object.
  res.status(200).json({
    lastUpdatedAt: lastStockUpdateTimestamp,
  });
});

module.exports = router;
