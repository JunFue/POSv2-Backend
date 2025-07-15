// --- useAuth.js ---
// This new conceptual file contains only the custom hook.

import { useContext } from "react";
import { AuthContext } from "../../../../context/AuthContext";

// Custom hook for consuming the auth context
export function useAuth() {
  return useContext(AuthContext);
}
