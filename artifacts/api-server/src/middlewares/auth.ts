import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && (req.session as { authenticated?: boolean }).authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}
