import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { supabase } from "../utils/supabaseClient";

// Estrategia Local (email y password)
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        // Buscar el usuario por email en Supabase
        const { data: users, error } = await supabase
          .from("users")
          .select("id, email, password, name, role")
          .eq("email", email);
        if (error) throw error;
        const user = users && users.length > 0 ? users[0] : null;
        if (!user) {
          // No existe el usuario
          return done(null, false, { message: "Email no registrado" });
        }
        // Comparar la contraseña hash almacenada con la proporcionada
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          // Contraseña incorrecta
          return done(null, false, { message: "Contraseña incorrecta" });
        }
        // Autenticación exitosa:
        // No exponemos el hash de password en el objeto usuario que vamos a guardar en sesión
        delete user.password;
        return done(null, user);
      } catch (err) {
        console.error("Error en auth local:", err);
        return done(err);
      }
    }
  )
);

// Estrategia Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || " ",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || " ",
      callbackURL: "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // El perfil de Google nos da la info del usuario
        const googleId = profile.id;
        const email = profile.emails?.[0].value;
        const name = profile.displayName || profile.name?.givenName;

        if (!email) {
          return done(null, false, { message: "No se obtuvo email de Google" });
        }
        // Buscar si ya existe un usuario con ese email (o quizás guardar googleId)
        const { data: users, error } = await supabase
          .from("users")
          .select("id, email, name, role, google_id")
          .eq("email", email);
        if (error) throw error;
        let user = users && users.length > 0 ? users[0] : null;
        if (!user) {
          // Si no existe, crear un nuevo usuario en nuestra tabla 'users'
          const { data, error: insertError } = await supabase
            .from("users")
            .insert([
              {
                email: email,
                name: name,
                password: null, // no hay password porque viene de Google
                role: "user",
                google_id: googleId,
              },
            ])
            .select(); // select() para obtener el registro insertado
          if (insertError) throw insertError;
          user = data ? data[0] : null;
        } else {
          // Si existe pero no tenía google_id guardado, podríamos actualizarlo:
          if (!user.google_id) {
            await supabase
              .from("users")
              .update({ google_id: googleId })
              .eq("id", user.id);
          }
        }
        return done(null, user);
      } catch (err) {
        console.error("Error en auth Google:", err);
        return done(err);
      }
    }
  )
);

// Serialización y deserialización de usuario para la sesión
passport.serializeUser((user: any, done) => {
  // Guardar en la sesión únicamente el ID del usuario
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  // Al recibir el ID de la sesión, buscar el usuario en la base de datos
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", id);
    if (error) throw error;
    const user = users && users.length > 0 ? users[0] : null;
    return done(null, user || null);
  } catch (err) {
    console.error("Error deserializando user:", err);
    return done(err);
  }
});
