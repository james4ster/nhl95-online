import { createClient } from "@supabase/supabase-js";

/* const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
*/

const supabaseUrl = "https://xcctjhidefsgronnfrjl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY3RqaGlkZWZzZ3Jvbm5mcmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzIzODAsImV4cCI6MjA4MTc0ODM4MH0.h4Up5QtqJUEsH0-6vQi7nEyYAKI8sXy2NogriJp0QqM";

console.log("Supabase URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
