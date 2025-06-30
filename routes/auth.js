const express = require("express");
const { supabase } = require("../config/supabaseClient.js"); // Use require

const router = express.Router();

// --- SIGNUP ROUTE USING SUPABASE AUTH ---
router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ error: "Full name, email, and password are required." });
  }

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        fullName: fullName,
      },
    },
  });

  if (error) {
    console.error("Error during Supabase signup:", error.message);
    return res.status(error.status || 500).json({ error: error.message });
  }

  res.status(201).json({
    message: "User created successfully! Please check your email to verify.",
    user: data.user,
  });
});

// --- LOGIN ROUTE USING SUPABASE AUTH ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    console.error("Error during Supabase login:", error.message);
    return res.status(error.status || 400).json({ error: error.message });
  }

  res.status(200).json(data.session);
});

module.exports = router; // Use module.exports
