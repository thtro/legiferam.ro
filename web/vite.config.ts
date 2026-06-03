import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In local-native dev, proxy /api to the FastAPI server so cookies stay same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
