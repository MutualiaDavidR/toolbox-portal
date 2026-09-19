// ⚠️ À compléter avec les infos de ton projet Supabase
// (Project Settings > API dans le tableau de bord Supabase)
const SUPABASE_URL = "https://fnrworvnwzgqgjlgskht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucndvcnZud3pncWdqbGdza2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDk4NzEsImV4cCI6MjEwNTI4NTg3MX0.gvR2aRru4rU_PQTKHevURW428RuV3R3SefW2M3UQamI";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
