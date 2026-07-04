/* ============================================
   NUKHBA — /api/check-notifications
   Vercel Cron job (runs hourly via vercel.json).
   Inserts session and homework reminder notifications
   using the service-role key. Ignores duplicates.
   ============================================ */

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });
  }

  var admin = createClient(
    process.env.SUPABASE_URL || 'https://svndlstlmauqjrnkiisf.supabase.co',
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  var now  = new Date();
  var rows = [];

  // ---- Session reminders ------------------------------------------------

  // 1h window: sessions scheduled 50–70 min from now
  var s1hStart = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  var s1hEnd   = new Date(now.getTime() + 70 * 60 * 1000).toISOString();
  var sess1h   = await admin
    .from('sessions')
    .select('id, scheduled_at, student_id, tutor_id, students(parent_id)')
    .gte('scheduled_at', s1hStart)
    .lte('scheduled_at', s1hEnd)
    .eq('status', 'upcoming');

  (sess1h.data || []).forEach(function(s) {
    var msg      = 'Session starting in 1 hour';
    var parentId = s.students && s.students.parent_id;
    if (s.student_id) rows.push({ user_id: s.student_id, type: 'session_reminder_1h', related_id: s.id, message: msg });
    if (s.tutor_id)   rows.push({ user_id: s.tutor_id,   type: 'session_reminder_1h', related_id: s.id, message: msg });
    if (parentId)     rows.push({ user_id: parentId,      type: 'session_reminder_1h', related_id: s.id, message: msg });
  });

  // 24h window: sessions scheduled 23–25 hours from now
  var s24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  var s24hEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
  var sess24h   = await admin
    .from('sessions')
    .select('id, scheduled_at, student_id, tutor_id, students(parent_id)')
    .gte('scheduled_at', s24hStart)
    .lte('scheduled_at', s24hEnd)
    .eq('status', 'upcoming');

  (sess24h.data || []).forEach(function(s) {
    var msg      = 'Session scheduled for tomorrow';
    var parentId = s.students && s.students.parent_id;
    if (s.student_id) rows.push({ user_id: s.student_id, type: 'session_reminder_24h', related_id: s.id, message: msg });
    if (s.tutor_id)   rows.push({ user_id: s.tutor_id,   type: 'session_reminder_24h', related_id: s.id, message: msg });
    if (parentId)     rows.push({ user_id: parentId,      type: 'session_reminder_24h', related_id: s.id, message: msg });
  });

  // ---- Homework reminders -----------------------------------------------

  var today    = now.toISOString().split('T')[0];
  var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Due today and still pending
  var hwToday = await admin
    .from('homework')
    .select('id, title, student_id, students(parent_id)')
    .eq('due_date', today)
    .eq('status', 'pending');

  (hwToday.data || []).forEach(function(hw) {
    var msg      = 'Homework due today: ' + hw.title;
    var parentId = hw.students && hw.students.parent_id;
    if (hw.student_id) rows.push({ user_id: hw.student_id, type: 'homework_due_today', related_id: hw.id, message: msg });
    if (parentId)      rows.push({ user_id: parentId,       type: 'homework_due_today', related_id: hw.id, message: msg });
  });

  // Due tomorrow and still pending
  var hwTmrw = await admin
    .from('homework')
    .select('id, title, student_id, students(parent_id)')
    .eq('due_date', tomorrow)
    .eq('status', 'pending');

  (hwTmrw.data || []).forEach(function(hw) {
    var msg      = 'Homework due tomorrow: ' + hw.title;
    var parentId = hw.students && hw.students.parent_id;
    if (hw.student_id) rows.push({ user_id: hw.student_id, type: 'homework_due_24h', related_id: hw.id, message: msg });
    if (parentId)      rows.push({ user_id: parentId,       type: 'homework_due_24h', related_id: hw.id, message: msg });
  });

  // ---- Insert (ignore duplicates via UNIQUE constraint) -----------------

  if (!rows.length) {
    return res.status(200).json({ inserted: 0 });
  }

  var result = await admin.from('notifications').upsert(rows, {
    onConflict:       'user_id,type,related_id',
    ignoreDuplicates: true,
  });

  return res.status(200).json({
    attempted: rows.length,
    error:     result.error ? result.error.message : null,
  });
};
