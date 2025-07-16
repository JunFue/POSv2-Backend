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

// --- Advanced Request/Response Logger ---
app.use((req, res, next) => {
  // Log the incoming request
  console.log(
    `[SERVER LOG] ==> Incoming Request: ${req.method} ${req.originalUrl}`
  );

  // Use the 'finish' event on the response object to log when the response is sent
  res.on("finish", () => {
    // Log the status code of the response
    console.log(
      `[SERVER LOG] <== Responded to ${req.method} ${req.originalUrl} with Status: ${res.statusCode}`
    );
  });

  // Continue to the next middleware or route handler
  next();
});
// --- End Logger ---

// --- Routes ---
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");
const paymentRoutes = require("./routes/payments")(io);
const cashoutRoutes = require("./routes/cashout")(io);
const stocksManagementRoutes = require("./routes/stocksManagement");
const userManagementRoutes = require("./routes/userManagement");
const inventoryRoutes = require("./routes/inventory");
const flashInfoRoutes = require("./routes/flashInfo.js");
const reportRoutes = require("./routes/reports.js");

app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", cashoutRoutes);
app.use("/api", stocksManagementRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/flash-info", flashInfoRoutes);
app.use("/api/reports", reportRoutes);

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
