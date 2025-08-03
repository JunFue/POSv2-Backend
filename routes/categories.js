// File: routes/categories.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// --- REVISION ---
// Apply the authentication middleware to all routes in this file.
// Any request to /api/categories/* will now require a valid token.
router.use(authMiddleware);

// GET all categories for the logged-in user
router.get("/", async (req, res) => {
  try {
    // We can now safely use req.supabase as it's attached by the middleware.
    const { data, error } = await req.supabase
      .from("categories")
      .select("id, name");

    if (error) {
      console.error("Supabase GET Error:", error.message);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error("Catch Block Error in GET /categories:", error.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST a new category
router.post("/", async (req, res) => {
  const { name } = req.body;

  try {
    const { data, error } = await req.supabase
      .from("categories")
      .insert([{ name: name }])
      .select()
      .single();

    if (error) {
      console.error("Supabase POST Error:", error.message);
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Catch Block Error in POST /categories:", error.message);
    res.status(500).json({ message: "Failed to create category" });
  }
});

// DELETE a category by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await req.supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase DELETE Error:", error.message);
      throw error;
    }

    res.status(204).send(); // 204 No Content
  } catch (error) {
    console.error("Catch Block Error in DELETE /categories:", error.message);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

module.exports = router;
