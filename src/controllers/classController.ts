import { Request, Response, NextFunction } from "express";
import { supabase } from "../utils/supabaseClient";

// Crear una nueva clase (solo admins)
export const createClass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, description, scheduled_at, capacity } = req.body;
  const user = req.user as any;
  try {
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Solo administradores pueden crear clases" });
    }
    if (!title || !scheduled_at) {
      return res.status(400).json({ error: "Título y fecha son obligatorios" });
    }
    // Insertar nueva clase en la tabla 'classes'
    const { data, error } = await supabase
      .from("classes")
      .insert([
        {
          title,
          description,
          scheduled_at,
          capacity,
          created_by: user.id,
        },
      ])
      .select();
    if (error) throw error;
    const newClass = data ? data[0] : null;
    return res.status(201).json({ message: "Clase creada", class: newClass });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Listar clases (para que alumnos y admins vean el calendario de clases)
export const listClasses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { data: classes, error } = await supabase
      .from("classes")
      .select("*")
      .order("scheduled_at");
    if (error) throw error;
    return res.json(classes);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Inscribir al usuario en una clase
export const enrollClass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as any;
  const { classId } = req.params;
  try {
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    // Insertar inscripción en la tabla "enrollments"
    const { error } = await supabase.from("enrollments").insert([
      {
        user_id: user.id,
        class_id: classId,
      },
    ]);
    if (error) throw error;
    return res.status(200).json({ message: "Inscripción exitosa" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
