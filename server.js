require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const itemRoutes = require("./routes/items");
const transactionRoutes = require("./routes/transactions");

const paymentRoutes = require("./routes/payments");
const cashoutRoutes = require("./routes/cashout");
const stocksManagementRoutes = require("./routes/stocksManagement");
const userManagementRoutes = require("./routes/userManagement");

app.use("/api", itemRoutes);
app.use("/api", transactionRoutes);

app.use("/api", paymentRoutes);

app.use("/api", cashoutRoutes);
app.use("/api", stocksManagementRoutes);

app.use("/api/admin", userManagementRoutes);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
