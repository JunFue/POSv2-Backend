const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable CORS for requests from your frontend
app.use(cors({ origin: "http://localhost:5173" }));
// Enable parsing of JSON bodies in requests
app.use(express.json());

// --- Import Route Files ---
const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");

// --- Use Routes ---
// Any request starting with /api/auth will be handled by authRoutes
app.use("/api/auth", authRoutes);

// Any request starting with /api will be handled by the other routers
// Note: We use /api for items and transactions to match your original file structure
app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
