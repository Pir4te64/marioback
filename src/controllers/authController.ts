import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { supabase } from "../utils/supabaseClient";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Normalizamos el email a minúsculas
    const normalizedEmail = email.toLowerCase();

    // Verificar si el email ya existe
    const { data: existingUsers, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail);
    if (findError) throw findError;
    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar el nuevo usuario en la tabla "users"
    // Forzamos el rol "user" en el registro
    const { error: insertError } = await supabase.from("users").insert([
      {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        role: "user",
      },
    ]);
    if (insertError) throw insertError;

    return res
      .status(201)
      .json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error en register:", err);
    next(err);
  }
};
