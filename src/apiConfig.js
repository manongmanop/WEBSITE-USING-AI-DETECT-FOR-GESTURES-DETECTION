import axios from "axios";

// Get API base URL from environment variables, removing trailing slashes
export const API_BASE = (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "");

// Configure axios globally to always use this base URL
axios.defaults.baseURL = API_BASE;
