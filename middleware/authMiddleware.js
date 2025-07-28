// File: middleware/authMiddleware.js
const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config/supabaseClient.js"); // Global client for initial auth check

// These should be available from your environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Auth Error: No Bearer token found.");
    return res
      .status(401)
      .json({ error: "No token provided or invalid format." });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Supabase Auth Error:", error.message);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid token.", details: error.message });
  }

  if (!user) {
    console.error("Auth Error: No user found for this token.");
    return res.status(401).json({ error: "Unauthorized: Invalid token." });
  }

  // Attach the user object to the request.
  req.user = user;

  // --- User's RLS logic is preserved ---
  // Create a new Supabase client that is authenticated as this specific user.
  // This client will be used for any database operations in the route handlers.
  console.log("Creating user-specific Supabase client.");
  const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Attach the new user-specific client to the request object.
  req.supabase = userSupabaseClient;
  next();
};

module.exports = authMiddleware;
