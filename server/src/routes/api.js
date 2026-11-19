// server/src/routes/api.js — REST API
import { Router } from "express";
import { getDefaultData } from "../defaultData.js";
import { buildAlternativeMatrices } from "../ahp/criteria.js";
import { runAhp, runAnalysis, validateProducts } from "../services/analysisService.js";
import { buildTsv } from "../export/tsv.js";

export function createRouter() {
  const router = Router();
  // Єдиний обробник помилок: некоректні дані -> HTTP 400 зі зрозумілим повідомленням
  const safe = fn => (req, res) => { try { res.json({ ok: true, result: fn(req.body ?? {}) }); } catch (e) { res.status(400).json({ ok: false, message: e.message }); } };

  router.get("/health", (req, res) => res.json({ ok: true }));
  router.get("/default", (req, res) => res.json({ ok: true, result: getDefaultData() }));
  router.post("/matrices", safe(b => { validateProducts(b.products); return buildAlternativeMatrices(b.products); }));
  router.post("/ahp", safe(runAhp));
  router.post("/analyze", safe(runAnalysis));
  router.post("/export", safe(b => ({ filename: "assortment-optimization.tsv", content: buildTsv(b, runAnalysis(b)) })));
  return router;
}
