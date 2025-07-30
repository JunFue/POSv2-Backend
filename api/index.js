// File: api/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authMiddleware = require("../middleware/authMiddleware"); // Ensure this import exists

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

// --- Routes (paths updated and corrected) ---
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
// --- NEW: Import the categoricalReport route ---
const categoricalReportRoutes = require("../routes/categoricalReport.js");

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
app.use("/api/categories", authMiddleware, categoriesRouter);

// --- NEW: Mount the categoricalReport route ---
// Since the middleware is already applied within categoricalReport.js, we don't need to add it here.
app.use("/api/categorical-report", categoricalReportRoutes);

// Export the Express app handler for Vercel
module.exports = app;
