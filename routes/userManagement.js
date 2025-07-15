const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("../config/supabaseClient.js"); // Import the regular client for user auth

const router = express.Router();

// --- Enhanced Logging for Debugging ---
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error(
    "FATAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined in .env file."
  );
  // We throw an error to prevent the app from starting with a broken configuration.
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined.");
}
// --- End Enhanced Logging ---

// Initialize the Admin Supabase client for the deletion action
const supabaseAdmin = createClient(
  process.env.DATABASE_URL,
  serviceKey // Use the variable we just checked
);

// New middleware to authenticate a user and ensure they are deleting themselves
const authenticateAndDeleteSelf = async (req, res, next) => {
  // 1. Get the JWT from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Authorization header is missing or invalid." });
  }
  const token = authHeader.split(" ")[1];

  // 2. Verify the token and get the user object
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res
      .status(401)
      .json({ error: "Not authenticated or token is invalid." });
  }

  // 3. Check if the authenticated user's ID matches the ID in the URL
  if (user.id !== req.params.id) {
    return res
      .status(403)
      .json({ error: "Forbidden: You can only delete your own account." });
  }

  // 4. If everything checks out, proceed to the delete logic
  console.log(`User ${user.id} is authorized to delete their own account.`);
  next();
};

// --- DELETE A USER FROM AUTH SCHEMA ---
// The route now uses the new, more secure middleware
router.delete("/users/:id", authenticateAndDeleteSelf, async (req, res) => {
  const { id } = req.params; // The user_id to delete

  console.log(
    `Attempting to delete user with ID: ${id} using admin privileges.`
  );

  // --- DEBUGGING STEP: Try a soft delete ---
  // A hard delete (the default) can fail due to foreign key constraints or other issues.
  // A soft delete marks the user as deleted without removing them, which can help diagnose the problem.
  const shouldSoftDelete = true;

  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(
    id,
    shouldSoftDelete
  );

  if (error) {
    // --- Enhanced Error Logging ---
    console.error(
      "Full Supabase admin error object:",
      JSON.stringify(error, null, 2)
    );
    return res.status(500).json({ error: error.message });
  }

  console.log("Successfully deleted user from auth.users:", data);
  res.status(200).json({ message: "User deleted successfully" });
});

module.exports = router;
