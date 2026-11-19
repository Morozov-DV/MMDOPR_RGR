// server/src/index.js — запуск сервера
import { createApp } from "./app.js";
const PORT = process.env.PORT || 3000;
createApp().listen(PORT, "0.0.0.0", () => console.log(`API працює: http://localhost:${PORT}/api/health`));
