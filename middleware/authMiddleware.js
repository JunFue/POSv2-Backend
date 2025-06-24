const jwt = require("jsonwebtoken");

// Get your JWT secret from environment variables or use a default
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-that-is-long";

/**
 * This is our authentication middleware.
 * It will protect routes that require a user to be logged in.
 */
const authMiddleware = (req, res, next) => {
  // 1. Get the token from the request header.
  // Tokens are usually sent in the format: "Bearer <token>"
  const authHeader = req.header("Authorization");

  // 2. Check if a token was provided.
  if (!authHeader) {
    // If no token is found, send a 401 Unauthorized error.
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // The header looks like "Bearer eyJhbGciOiJ...", so we split the string
    // by the space and take the second part, which is the actual token.
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. Malformed token." });
    }

    // 3. Verify the token's validity.
    // jwt.verify will decode the token. If it's not valid (e.g., expired or tampered with),
    // it will throw an error, which will be caught by our catch block.
    const decodedPayload = jwt.verify(token, JWT_SECRET);

    // 4. Attach the user's information to the request object.
    // The decoded payload contains the user object we added when we created the token.
    // We attach it to `req.user` so our protected routes can access it later.
    req.user = decodedPayload.user;

    // 5. Call next() to pass control to the next middleware or the actual route handler.
    next();
  } catch (error) {
    // If token verification fails, send a 400 Bad Request error.
    res.status(400).json({ error: "Invalid token." });
  }
};

module.exports = authMiddleware;
