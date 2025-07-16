const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config/supabaseClient.js"); // Your existing global client

// These should be available from your environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const authMiddleware = async (req, res, next) => {
  // Your existing token validation logic (no changes here)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "No token provided or invalid format." });
  }
  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized: Invalid token." });
  }

  // --- FIX: ADDITION ---
  // Create a new Supabase client that is authenticated as this specific user.
  // This client will be used for any database operations in the next step.
  const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  // --- END FIX: ADDITION ---

  // Attach both the user and the new user-specific client to the request object.
  req.user = user;
  req.supabase = userSupabaseClient; // This is the new part that fixes the RLS issue.

  next();
};

module.exports = authMiddleware;
