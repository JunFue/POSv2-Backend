const { supabase } = require("../config/supabaseClient.js");

const authMiddleware = async (req, res, next) => {
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

  req.user = user;
  next();
};

module.exports = authMiddleware;
