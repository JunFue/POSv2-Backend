const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- Import Route Files ---
const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");
// --- 1. Import the new payments route file ---
const paymentRoutes = require("./routes/payments");

// --- Use Routes ---
app.use("/api/auth", authRoutes);
app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);
// --- 2. Register the new payments route ---
app.use("/api", paymentRoutes);

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
