import { Request, Response, NextFunction } from "express";

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  console.log("req.isAuthenticated:", req.isAuthenticated);
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "No autenticado" });
}

export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (
    !req.isAuthenticated ||
    typeof req.isAuthenticated !== "function" ||
    !req.isAuthenticated()
  ) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const user = req.user as any;
  if (user?.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Acceso denegado: se requiere rol admin" });
  }
  next();
}
