require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http"); // Import the Node.js http module
const { Server } = require("socket.io"); // Import socket.io
// Use your existing Supabase client from the root directory
const { supabase } = require("./config/supabaseClient");

const app = express();
const server = http.createServer(app); // Create an HTTP server from the Express app

// Initialize Socket.IO and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- Routes ---
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");
const paymentRoutes = require("./routes/payments");
const cashoutRoutes = require("./routes/cashout");
const stocksManagementRoutes = require("./routes/stocksManagement");
const userManagementRoutes = require("./routes/userManagement");
const inventoryRoutes = require("./routes/inventory"); // Import the new inventory route

app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", cashoutRoutes);
app.use("/api", stocksManagementRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api", inventoryRoutes); // Use the new inventory route

// --- Real-time Logic ---
// Listen for any changes in the item_inventory table
const inventoryListener = supabase
  .channel("item_inventory_changes")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "item_inventory" },
    (payload) => {
      console.log("Database change detected, emitting update:", payload.new);
      // When a change occurs, emit an event to all connected clients
      io.emit("inventory_update", payload.new);
    }
  )
  .subscribe();

console.log("Successfully subscribed to real-time inventory changes.");

// --- Socket.IO Connection Handling ---
io.on("connection", (socket) => {
  console.log(`A user connected via WebSocket: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
// Use the 'server' instance (with socket.io) instead of 'app' to listen
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
