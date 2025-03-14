import { Request, Response, NextFunction } from "express";
import { supabase } from "../utils/supabaseClient";

/**
 * Crear una nueva clase (solo para administradores).
 * Requiere en el body: 
 * - title: string
 * - scheduled_at: timestamp (fecha de la clase)
 * - cost: number (puntos requeridos para inscribirse)
 * Opcionalmente: description y capacity.
 */
export const createClass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, description, scheduled_at, capacity, cost } = req.body;
  const user = req.user as any; // se asume que Passport ya coloca el usuario autenticado en req.user
  try {
    // Verifica que el usuario esté autenticado y tenga rol "admin"
    if (!user || user.role.toLowerCase() !== "admin") {
      return res
        .status(403)
        .json({ error: "Solo administradores pueden crear clases" });
    }
    // Validar campos obligatorios
    if (!title || !scheduled_at || cost === undefined) {
      return res
        .status(400)
        .json({ error: "Título, fecha y costo son obligatorios" });
    }
    // Insertar la nueva clase en la tabla "classes"
    const { data, error } = await supabase
      .from("classes")
      .insert([
        {
          title,
          description,
          scheduled_at,
          capacity,
          cost,
          created_by: user.id,
        },
      ])
      .select();
    if (error) throw error;
    const newClass = data ? data[0] : null;
    return res.status(201).json({ message: "Clase creada", class: newClass });
  } catch (err) {
    console.error("Error en createClass:", err);
    next(err);
  }
};

/**
 * Listar todas las clases (para que alumnos y administradores vean el calendario).
 */
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
    console.error("Error en listClasses:", err);
    next(err);
  }
};

/**
 * Inscribir al usuario en una clase y descontar los puntos de su suscripción.
 * Se realiza el siguiente flujo:
 * 1. Se verifica que el usuario esté autenticado.
 * 2. Se obtiene la clase para conocer su costo.
 * 3. Se comprueba que el usuario no esté ya inscrito.
 * 4. Se obtiene el perfil del usuario (tabla "profiles") para saber sus puntos.
 * 5. Si tiene suficientes puntos, se inserta la inscripción (tabla "enrollments")
 *    y se actualizan los puntos del usuario (descontando el costo).
 */
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
    // Obtener la clase para conocer su costo y capacidad (si es necesario)
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, cost, capacity")
      .eq("id", classId)
      .single();
    if (classError) throw classError;
    if (!classData) return res.status(404).json({ error: "Clase no encontrada" });
    const classCost = classData.cost;

    // Verificar si el usuario ya está inscrito en esta clase
    const { data: existingEnrollment, error: enrollmentCheckError } =
      await supabase
        .from("enrollments")
        .select("id")
        .eq("class_id", classId)
        .eq("user_id", user.id);
    if (enrollmentCheckError) throw enrollmentCheckError;
    if (existingEnrollment && existingEnrollment.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya estás inscrito en esta clase" });
    }

    // Obtener el perfil del usuario para conocer sus puntos
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile)
      return res.status(404).json({ error: "Perfil del usuario no encontrado" });
    const currentPoints = profile.points;
    if (currentPoints < classCost) {
      return res
        .status(400)
        .json({ error: "No tienes suficientes puntos para inscribirte a esta clase" });
    }

    // Insertar la inscripción en la tabla "enrollments"
    const { error: insertError } = await supabase
      .from("enrollments")
      .insert([{ user_id: user.id, class_id: classId }]);
    if (insertError) throw insertError;

    // Actualizar el perfil del usuario: descontar los puntos
    const newPoints = currentPoints - classCost;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", user.id);
    if (updateError) throw updateError;

    return res
      .status(200)
      .json({ message: "Inscripción exitosa", newPoints });
  } catch (err) {
    console.error("Error en enrollClass:", err);
    next(err);
  }
};
