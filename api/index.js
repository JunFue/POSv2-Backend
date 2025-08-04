// File: api/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authMiddleware = require("../middleware/authMiddleware");

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));
// --- END OF CORS CONFIGURATION ---

app.use(express.json());

// --- Health Check Route ---
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// --- Routes ---
const itemRoutes = require("../routes/items");
const transactionRoutes = require("../routes/transactions");
const stocksManagementRoutes = require("../routes/stocksManagement");
const userManagementRoutes = require("../routes/userManagement");
const inventoryRoutes = require("../routes/inventory");
const flashInfoRoutes = require("../routes/flashInfo.js");
const reportRoutes = require("../routes/reports.js");
const paymentRoutes = require("../routes/payments");
const cashoutRoutes = require("../routes/cashout");
const categoriesRouter = require("../routes/categories");
const categoricalReportRoutes = require("../routes/categoricalReport.js");

// --- MODIFICATION: Use the reliable database-driven status route ---
// Import the router object specifically from status.js
const statusRoutes = require("../routes/status").router;

// DELETE THIS: The old, file-based status route is no longer needed.
// const stocksStatus = require("../routes/stocksStatus.js");

// Apply routes
app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);
app.use("/api", stocksManagementRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/flash-info", flashInfoRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", paymentRoutes);
app.use("/api", cashoutRoutes);

// --- MODIFICATION: Apply the new status route ---
app.use("/api/status", statusRoutes);

// DELETE THIS: Remove the old route handler
// app.use("/api", stocksStatus);

// --- REVISION ---
// The authMiddleware is now applied inside the respective route files.
app.use("/api/categories", categoriesRouter);
app.use("/api/reports/categorical", categoricalReportRoutes);

// Export the Express app handler for Vercel
module.exports = app;
