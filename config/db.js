const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool instance.
// The Pool constructor will automatically use the connection string
// from the DATABASE_URL environment variable if it's available.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // The 'ssl' configuration might be necessary if you're connecting
  // to a cloud database provider like Supabase, Heroku, or Neon.
  // For local development, you might not need it.
  ssl: {
    rejectUnauthorized: false,
  },
});

// We export the pool object so our routes can use it to query the database
module.exports = pool;
