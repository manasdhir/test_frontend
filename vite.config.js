import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    hmr: {
      // Use 443 for HTTPS or 80 for HTTP tunnels
      clientPort: 443,
    },
  },
});
