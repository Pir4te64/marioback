import { Router } from "express";
import { ensureAuth, ensureAdmin } from "../middlewares/authMiddleware";
import {
  createClass,
  listClasses,
  enrollClass,
} from "../controllers/classcontroller";

const router = Router();

// Inscribir al usuario autenticado en una clase
router.post("/classes/:classId/enroll", ensureAuth, enrollClass);

// Obtener todas las clases (disponible para usuarios autenticados)
router.get("/classes", ensureAuth, listClasses);

// Crear una nueva clase (solo admin)
router.post("/classes", ensureAuth, ensureAdmin, createClass);

export default router;
