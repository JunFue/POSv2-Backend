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
  console.log("--- GET /api/categories triggered ---");
  try {
    // We can now safely use req.supabase as it's attached by the middleware.
    const { data, error } = await req.supabase
      .from("categories")
      .select("id, name");

    if (error) {
      console.error("Supabase GET Error:", error.message);
      throw error;
    }

    console.log("Successfully fetched categories:", data);
    res.json(data);
  } catch (error) {
    console.error("Catch Block Error in GET /categories:", error.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST a new category
router.post("/", async (req, res) => {
  console.log("--- POST /api/categories triggered ---");
  const { name } = req.body;
  console.log("Request Body:", req.body);

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

    console.log("Successfully inserted category:", data);
    res.status(201).json(data);
  } catch (error) {
    console.error("Catch Block Error in POST /categories:", error.message);
    res.status(500).json({ message: "Failed to create category" });
  }
});

// DELETE a category by ID
router.delete("/:id", async (req, res) => {
  console.log("--- DELETE /api/categories/:id triggered ---");
  const { id } = req.params;
  console.log("Category ID to delete:", id);

  try {
    const { error } = await req.supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase DELETE Error:", error.message);
      throw error;
    }

    console.log("Successfully deleted category with ID:", id);
    res.status(204).send(); // 204 No Content
  } catch (error) {
    console.error("Catch Block Error in DELETE /categories:", error.message);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

module.exports = router;
