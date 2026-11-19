import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// /api перенаправляється на Express (порт 3000). fs.allow дозволяє клієнту підключати модулі ../server (запасний режим без сервера)
export default defineConfig({
  plugins: [vue()],
  server: { host: true, port: 5173, fs: { allow: [".."] }, proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: true } } }
});
