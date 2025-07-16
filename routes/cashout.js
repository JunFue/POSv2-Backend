const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const { supabase } = require("../config/supabaseClient");

module.exports = function (io) {
  // GET /api/cashout - Fetches cashout records
  // This route is working correctly.
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
        query = query
          .gte("cashout_date", startDate)
          .lte("cashout_date", endDate);
      } else {
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

  // --- FIX: Corrected POST /api/cashout Handler ---
  // Creates a new cashout record.
  router.post("/cashout", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount, category, notes, receiptNo, cashout_date } = req.body;

      if (!amount || !category || !cashout_date) {
        return res
          .status(400)
          .json({
            error:
              "Missing required fields: amount, category, or cashout_date.",
          });
      }

      // --- DIAGNOSTIC LOG ---
      // Let's log the exact data we are about to insert. This will help us verify
      // that the `user_id` is present and correct before the database call.
      const insertPayload = {
        amount,
        category,
        notes,
        receipt_no: receiptNo,
        cashout_date,
        user_id: userId,
      };
      console.log(
        "[SERVER LOG] Attempting to insert payload:",
        JSON.stringify(insertPayload, null, 2)
      );
      // --- END DIAGNOSTIC LOG ---

      const { data, error } = await supabase
        .from("cashouts")
        .insert([insertPayload]) // Use the payload object
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
    // ... your existing DELETE logic ...
  });

  return router;
};
