/* ============================================
   NUKHBA — /api/delete-user
   Deletes a user from Supabase Auth using the
   service-role key (never exposed client-side).
   Called by DB.denyUser() in supabase.js.
   ============================================ */

const { createClient } = require('@supabase/supabase-js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var userId = req.body && req.body.userId;
  if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });
  }

  var supabaseUrl = process.env.SUPABASE_URL || 'https://svndlstlmauqjrnkiisf.supabase.co';

  var admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  var result = await admin.auth.admin.deleteUser(userId);
  if (result.error) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.status(200).json({ success: true });
};
