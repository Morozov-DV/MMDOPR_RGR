// server/src/app.js — Express-застосунок
import express from "express";
import cors from "cors";
import { createRouter } from "./routes/api.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", createRouter());
  app.use((err, req, res, next) => res.status(400).json({ ok: false, message: "Некоректний JSON у запиті." }));
  return app;
}
