const express = require("express");
const router = express.Router();
// You no longer need the global client here for the route logic
// const { supabase } = require("../config/supabaseClient");
const authMiddleware = require("../middleware/authMiddleware"); // Assuming this is the path

// GET /api/inventory - Fetches all current inventory levels
// Protect the route with middleware first
router.get("/inventory", authMiddleware, async (req, res) => {
  try {
    // IMPORTANT: Use req.supabase, not the global supabase client
    const { data, error } = await req.supabase
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
