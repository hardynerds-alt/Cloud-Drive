import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import filesRouter from "./files.js";
import shareRouter from "./share.js";
import storageStatsRouter from "./storage-stats.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(filesRouter);
router.use(shareRouter);
router.use(storageStatsRouter);

export default router;
