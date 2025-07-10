const express = require("express");
const router = express.Router();
// Use your existing Supabase client from the root directory
const { supabase } = require("../config/supabaseClient");

// GET /api/inventory - Fetches all current inventory levels
router.get("/inventory", async (req, res) => {
  console.log("Received request for inventory data.");
  try {
    const { data, error } = await supabase
      .from("item_inventory")
      .select("*")
      .order("item_name", { ascending: true });

    if (error) {
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

module.exports = router;
