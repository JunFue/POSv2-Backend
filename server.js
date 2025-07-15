require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { supabase } = require("./config/supabaseClient");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- NEW DEBUG MIDDLEWARE ---
// This will log every single request that hits the server.
app.use((req, res, next) => {
  console.log(
    `[SERVER LOG] Incoming Request: ${req.method} ${req.originalUrl}`
  );
  next();
});
// --- END DEBUG ---

// --- Routes ---
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");
const paymentRoutes = require("./routes/payments")(io);
const cashoutRoutes = require("./routes/cashout")(io);
const stocksManagementRoutes = require("./routes/stocksManagement");
const userManagementRoutes = require("./routes/userManagement");
const inventoryRoutes = require("./routes/inventory");
const flashInfoRoutes = require("./routes/flashInfo.js");

app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", cashoutRoutes);
app.use("/api", stocksManagementRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/flash-info", flashInfoRoutes);

// --- Real-time Logic ---
const inventoryListener = supabase
  .channel("item_inventory_changes")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "item_inventory" },
    (payload) => {
      console.log("Database change detected, emitting update:", payload.new);
      io.emit("inventory_update", payload.new);
    }
  )
  .subscribe();

io.on("connection", (socket) => {
  console.log(`A user connected via WebSocket: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
