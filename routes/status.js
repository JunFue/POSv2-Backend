// File: routes/status.js
const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

// A list to hold all connected SSE clients
let clients = [];

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres.lrqzeyrtcfyxcnjbcwqg:Setneuflenuj-posv2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

/**
 * A helper function to update the global timestamp in the database.
 */
const updateTimestamp = async () => {
  const now = new Date().toISOString();
  console.log(`[DEBUG] Attempting to update timestamp in database to: ${now}`);
  try {
    await pool.query(
      `INSERT INTO app_status (id, last_updated_at)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET last_updated_at = $1;`,
      [now]
    );
    console.log(`[SUCCESS] Timestamp updated successfully.`);
  } catch (error) {
    console.error("[ERROR] Failed to update timestamp in database:", error);
  }
};

/**
 * Function to send updates to all connected clients.
 */
const sendUpdateToAllClients = () => {
  if (clients.length === 0) {
    console.log("[DEBUG] Broadcast triggered, but no clients are connected.");
    return;
  }

  console.log(
    `[DEBUG] Broadcasting "update" event to ${clients.length} client(s).`
  );
  const sseMessage = `event: update\ndata: {"message": "items have been updated"}\n\n`;

  clients.forEach((client) => {
    console.log(`[DEBUG] Sending update to client ID: ${client.id}`);
    client.res.write(sseMessage);
  });
};

/**
 * The SSE endpoint where clients connect for live updates.
 */
router.get("/stream", (req, res) => {
  console.log("[DEBUG] Received new request for /api/status/stream");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res: res,
  };

  clients.push(newClient);
  console.log(
    `[SUCCESS] Client ${clientId} connected. Total clients: ${clients.length}`
  );

  // Send a welcome message to confirm connection
  res.write(`event: connected\ndata: {"message":"Connection established"}\n\n`);

  req.on("close", () => {
    clients = clients.filter((client) => client.id !== clientId);
    console.log(
      `[DEBUG] Client ${clientId} disconnected. Total clients: ${clients.length}`
    );
  });
});

/**
 * The polling endpoint used to get the latest data timestamp.
 * The frontend calls this after a refresh to update its local cache timestamp.
 */
router.get("/stocks", async (req, res) => {
  // --- CHANGE: Added logs to trace the request and response ---
  console.log("[DEBUG] Received request for /api/status/stocks");
  try {
    const result = await pool.query(
      "SELECT last_updated_at FROM app_status WHERE id = 1"
    );

    if (result.rows.length === 0) {
      const newTimestamp = await updateTimestamp();
      const responsePayload = { lastUpdatedAt: newTimestamp };
      console.log(
        "[DEBUG] Responding to /api/status/stocks with new timestamp:",
        responsePayload
      );
      return res.json(responsePayload);
    }

    const responsePayload = { lastUpdatedAt: result.rows[0].last_updated_at };
    console.log(
      "[DEBUG] Responding to /api/status/stocks with existing timestamp:",
      responsePayload
    );
    res.json(responsePayload);
  } catch (error) {
    console.error(
      "[ERROR] Error fetching app status for /api/status/stocks:",
      error
    );
    res.status(500).json({ error: "Database error" });
  }
});

// Export the router and the functions to be used by other modules
module.exports = { router, updateTimestamp, sendUpdateToAllClients };
