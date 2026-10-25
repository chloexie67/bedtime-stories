import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Camera access needs https on anything other than localhost (e.g. a phone on your LAN):
// run `npm run dev:https` and open the https://<laptop-ip>:5173 URL, accepting the self-signed cert.
export default defineConfig({
  plugins: [react(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
