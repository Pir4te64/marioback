import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables de entorno

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
