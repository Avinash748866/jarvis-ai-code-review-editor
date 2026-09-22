// Base URL for the backend's /ai routes.
// Set VITE_API_URL in a .env file (see .env.example) to point at your
// backend. Falls back to a local backend on port 3000 for development.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/ai";
