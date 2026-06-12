import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { password } = req.body ?? {};

  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    req.log.warn("Failed login attempt");
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  (req.session as { authenticated?: boolean; username?: string }).authenticated = true;
  (req.session as { authenticated?: boolean; username?: string }).username = "admin";

  req.log.info("Admin logged in");
  res.json({ authenticated: true, username: "admin" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ authenticated: false, username: null });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const sess = req.session as { authenticated?: boolean; username?: string };
  if (sess.authenticated) {
    res.json({ authenticated: true, username: sess.username ?? "admin" });
  } else {
    res.json({ authenticated: false, username: null });
  }
});

export default router;
