/* ============================================
   NUKHBA — SUPABASE CONNECTION (safe version)
   ============================================ */

const SUPABASE_URL = 'https://svndlstlmauqjrnkiisf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bvfzUDSOWBe1jnBuTqWqGw_rwTCV6gt';

// Supabase will be initialized when needed
// For now the app runs in demo mode with local data
var supabase = null;

function initSupabase() {
  try {
    if (typeof window !== 'undefined' && window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('Supabase connected');
    }
  } catch(e) {
    console.log('Running in demo mode');
  }
}

// Call init when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}
