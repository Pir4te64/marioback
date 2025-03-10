import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { supabase } from "../utils/supabaseClient";

// Registro de un nuevo usuario (email y contraseña)
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, name } = req.body;
  try {
    // Validar datos mínimos
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Verificar si el email ya existe
    const { data: existingUsers, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email);

    if (findError) throw findError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    // Hashear la contraseña antes de guardar
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar el nuevo usuario en Supabase
    const { error: insertError } = await supabase.from("users").insert([
      {
        email: email,
        password: hashedPassword,
        name: name,
        role: "user", // rol por defecto para nuevos registros
      },
    ]);

    if (insertError) throw insertError;

    return res
      .status(201)
      .json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error(err);
    next(err); // delegamos el manejo de error a un middleware de error general
  }
};

// (Habrá más funciones, como login, logout, etc., que implementaremos con Passport)
