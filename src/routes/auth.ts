import { Router } from "express";
import passport from "passport";
import "../config/passport"; // importamos la configuración de Passport (ver sección 3.4)

import { register } from "../controllers/authController";

const router = Router();

//ruta de inicio
router.get("/", (req, res) => {
  res.send("Bienvenido a la API de clases");
});
// Ruta de registro
router.post("/auth/register", register);

// Ruta de login con estrategia local (email y password)
// Esta ruta utiliza passport.authenticate para manejar la autenticación
router.post(
  "/auth/login",
  passport.authenticate("local", {
    failureMessage: "Credenciales incorrectas",
  }),
  (req, res) => {
    // Si llega aquí, la autenticación fue exitosa (Passport almacena al usuario en req.user)
    res.json({ message: "Autenticado correctamente", user: req.user });
  }
);

// Ruta de logout
router.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({ message: "Sesión cerrada" });
  });
});

// Rutas de OAuth con Google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login", // en caso de fallo, redirigir a alguna página de login
  }),
  (req, res) => {
    // Autenticación con Google exitosa, redirigir al frontend
    res.redirect("http://localhost:3000"); // Podemos redirigir al homepage del frontend
  }
);

export default router;
