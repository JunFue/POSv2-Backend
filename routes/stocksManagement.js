const express = require("express");
const { supabase } = require("../config/supabaseClient.js"); // Adjust the path if necessary

const router = express.Router();

// Middleware to get user from Supabase JWT
const getUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Authorization header is missing or invalid." });
  }
  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res
      .status(401)
      .json({ error: "Not authenticated or token expired." });
  }

  req.user = user; // Attach user to the request object
  next();
};

// --- GET ALL STOCK RECORDS for the authenticated user ---
router.get("/stocks", getUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("stock_records")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching stock records:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- ADD A NEW STOCK RECORD ---
router.post("/stocks", getUser, async (req, res) => {
  const { item, packaging, stockFlow, quantity, notes, date } = req.body;

  if (!item || !stockFlow || !quantity) {
    return res
      .status(400)
      .json({ error: "Missing required fields: item, stockFlow, quantity." });
  }

  try {
    const { data, error } = await supabase
      .from("stock_records")
      .insert([
        {
          item,
          packaging,
          stockFlow: stockFlow, // FIX: Key must match the exact camelCase column name in the database
          quantity,
          notes,
          date,
          user_id: req.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error adding stock record:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- UPDATE AN EXISTING STOCK RECORD ---
router.put("/stocks/:id", getUser, async (req, res) => {
  const { id } = req.params;
  const { item, packaging, stockFlow, quantity, notes, date } = req.body;

  if (!item || !stockFlow || !quantity) {
    return res
      .status(400)
      .json({ error: "Missing required fields: item, stockFlow, quantity." });
  }

  try {
    const { data, error } = await supabase
      .from("stock_records")
      .update({
        item,
        packaging,
        stockFlow: stockFlow, // FIX: Key must match the exact camelCase column name
        quantity,
        notes,
        date,
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res
        .status(404)
        .json({ error: "Record not found or user not authorized." });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating stock record:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- DELETE A STOCK RECORD ---
router.delete("/stocks/:id", getUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { error, count } = await supabase
      .from("stock_records")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    if (count === 0) {
      return res
        .status(404)
        .json({ error: "Record not found or user not authorized." });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting stock record:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
