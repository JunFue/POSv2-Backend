// File: routes/cashout.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const { supabase } = require("../config/supabaseClient");

// GET /api/cashout - Fetches cashout records
router.get("/cashout", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { date, startDate, endDate } = req.query;

  try {
    let query = supabase.from("cashouts").select("*").eq("user_id", userId);

    if (date) {
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      query = query.gte("cashout_date", dayStart).lte("cashout_date", dayEnd);
    } else if (startDate && endDate) {
      query = query.gte("cashout_date", startDate).lte("cashout_date", endDate);
    } else {
      // Consider fetching all or recent cashouts if no date is provided,
      // instead of returning an error.
      // For now, keeping original logic.
      return res
        .status(400)
        .json({ error: "Please provide a date or a date range." });
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (error) {
    console.error("Error fetching cashouts:", error);
    res.status(500).json({ error: "Database error while fetching cashouts" });
  }
});

// POST /api/cashout - Creates a new cashout record
router.post("/cashout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, classification, notes, receiptNo, cashout_date, category } =
      req.body;

    if (!amount || !category || !cashout_date) {
      return res.status(400).json({
        error: "Missing required fields: amount, category, or cashout_date.",
      });
    }

    const insertPayload = {
      amount,
      classification,
      notes,
      receipt_no: receiptNo,
      cashout_date,
      user_id: userId,
      category,
    };

    const { data, error } = await supabase
      .from("cashouts")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating cashout:", error.message);
    res.status(500).json({ error: "Database error while creating cashout." });
  }
});

// DELETE /api/cashouts/:id - Deletes a specific cashout record
router.delete("/cashout/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from("cashouts")
      .delete()
      .match({ id: id, user_id: userId });

    if (error) {
      throw error;
    }

    res.status(200).json({ message: "Cashout record deleted successfully." });
  } catch (error) {
    console.error("Error deleting cashout:", error);
    res.status(500).json({ error: "Database error while deleting cashout." });
  }
});

// Directly export the router
module.exports = router;
