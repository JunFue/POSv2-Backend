require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { supabase } = require("./config/supabaseClient");

const app = express();
const server = http.createServer(app);

// --- DEPLOYMENT-READY CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:5173", // Your local frontend for development
  process.env.FRONTEND_URL, // Your live frontend URL (we will set this later)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
};

app.use(cors(corsOptions));
// --- END OF CORS CONFIGURATION ---

const io = new Server(server, {
  cors: corsOptions, // Use the same CORS options for Socket.IO
});

const PORT = process.env.PORT || 3000;
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

// --- NEW: Health Check Route ---
// This route helps us verify the server is running and responding to HTTP requests.
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});
// --- END OF HEALTH CHECK ---

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
