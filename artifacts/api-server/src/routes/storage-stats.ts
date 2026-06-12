import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getStorageStats } from "../lib/storage.js";

const router: IRouter = Router();

router.get("/storage/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const stats = await getStorageStats();
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to get storage stats");
    res.status(500).json({ error: "Failed to get storage stats" });
  }
});

export default router;
