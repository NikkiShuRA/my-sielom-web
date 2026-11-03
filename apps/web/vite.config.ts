import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base задаётся при сборке: vite build --base=/my-sielom-web/next/
export default defineConfig({
  plugins: [react()],
});
