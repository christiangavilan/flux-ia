
import { createClient } from '@supabase/supabase-js';

// Estas variables deben configurarse en tu entorno local (.env) o en tu plataforma de despliegue (Vercel/Netlify)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Evitamos crear el cliente si no hay credenciales para no romper la app en desarrollo local sin configuración
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
