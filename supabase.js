/* ============================================
   NUKHBA — SUPABASE CONNECTION
   ============================================ */

const SUPABASE_URL = 'https://svndlstlmauqjrnkiisf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bvfzUDSOWBe1jnBuTqWqGw_rwTCV6gt';

// Load Supabase from CDN (no install needed)
// This file is loaded before app.js in index.html

let supabase = null;

async function initSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase connected ✓');
  return supabase;
}

/* ============================================
   AUTH FUNCTIONS
   ============================================ */

// Sign up a new user
async function signUp(email, password, fullName, role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role }
    }
  });
  if (error) throw error;

  // Insert into our users table
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      avatar_initials: fullName.split(' ').map(w => w[0]).join('').toUpperCase(),
      is_approved: false
    });
  }
  return data;
}

// Sign in existing user
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Get their role from our users table
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { session: data, user: userData };
}

// Sign out
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get currently logged in user
async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return userData;
}

/* ============================================
   STUDENT FUNCTIONS
   ============================================ */

async function getStudentProfile(userId) {
  const { data, error } = await supabase
    .from('students')
    .select(`*, users(full_name, email)`)
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function getStudentSkillMap(studentId) {
  const { data, error } = await supabase
    .from('skill_map')
    .select('*')
    .eq('student_id', studentId)
    .order('subject');
  if (error) throw error;
  return data;
}

async function getStudentSessions(studentId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getStudentPoints(studentId) {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getStudentBalance(studentId) {
  const { data, error } = await supabase
    .from('students')
    .select('points_balance, points_total_earned, homework_streak, attendance_streak')
    .eq('id', studentId)
    .single();
  if (error) throw error;
  return data;
}

/* ============================================
   TUTOR FUNCTIONS
   ============================================ */

async function getTutorSessions(tutorId) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`*, students(id, users(full_name))`)
    .eq('tutor_id', tutorId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function getTutorStudents(tutorId) {
  const { data, error } = await supabase
    .from('students')
    .select(`*, users(full_name, email)`)
    .eq('tutor_id', tutorId);
  if (error) throw error;
  return data;
}

async function getTutorHours(tutorId) {
  const { data, error } = await supabase
    .from('tutor_hours')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('session_date', { ascending: false });
  if (error) throw error;
  return data;
}

async function submitSessionNote(sessionId, noteData) {
  const { data, error } = await supabase
    .from('session_notes')
    .insert({
      session_id: sessionId,
      topics_covered: noteData.topics,
      understanding_rating: noteData.rating,
      flag_for_next: noteData.flag,
      homework_assigned: noteData.homework,
      ai_draft: noteData.aiDraft,
      final_note: noteData.finalNote,
      is_approved: true,
      approved_at: new Date().toISOString()
    });
  if (error) throw error;

  // Update session status to completed
  await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);

  // Log tutor hours
  const session = await supabase.from('sessions').select('duration_minutes, tutor_id, scheduled_at').eq('id', sessionId).single();
  if (session.data) {
    await supabase.from('tutor_hours').insert({
      tutor_id: session.data.tutor_id,
      session_id: sessionId,
      hours_logged: session.data.duration_minutes / 60,
      session_date: new Date(session.data.scheduled_at).toISOString().split('T')[0]
    });
  }

  return data;
}

/* ============================================
   ADMIN FUNCTIONS
   ============================================ */

async function getAllStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`*, users(full_name, email, is_approved)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getAllTutors() {
  const { data, error } = await supabase
    .from('tutors')
    .select(`*, users(full_name, email, is_approved)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getPendingApprovals() {
  const { data, error } = await supabase
    .from('reward_requests')
    .select(`*, students(id, users(full_name)), rewards(name, icon)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function approveRewardRequest(requestId, reviewerId) {
  const { data, error } = await supabase
    .from('reward_requests')
    .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
  return data;
}

async function denyRewardRequest(requestId, reviewerId) {
  const { data, error } = await supabase
    .from('reward_requests')
    .update({ status: 'denied', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
  return data;
}

async function approveUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_approved: true })
    .eq('id', userId);
  if (error) throw error;
  return data;
}

async function getAllTutorHours() {
  const { data, error } = await supabase
    .from('tutor_hours')
    .select(`*, tutors(id, users(full_name))`)
    .order('session_date', { ascending: false });
  if (error) throw error;
  return data;
}

/* ============================================
   POINTS FUNCTIONS
   ============================================ */

async function awardPoints(studentId, amount, reason, sessionId = null) {
  // Add transaction record
  await supabase.from('points_transactions').insert({
    student_id: studentId,
    amount,
    type: 'earn',
    reason,
    session_id: sessionId
  });

  // Update student balance
  const { data: student } = await supabase
    .from('students')
    .select('points_balance, points_total_earned')
    .eq('id', studentId)
    .single();

  await supabase.from('students').update({
    points_balance: (student.points_balance || 0) + amount,
    points_total_earned: (student.points_total_earned || 0) + amount
  }).eq('id', studentId);
}

async function redeemPoints(studentId, rewardId, cost) {
  // Check balance
  const { data: student } = await supabase
    .from('students')
    .select('points_balance')
    .eq('id', studentId)
    .single();

  if (!student || student.points_balance < cost) {
    throw new Error('Insufficient points balance');
  }

  // Create redemption request (pending teacher approval)
  await supabase.from('reward_requests').insert({
    student_id: studentId,
    reward_id: rewardId,
    cost_points: cost,
    status: 'pending'
  });

  // Hold points (deduct from balance, pending approval)
  await supabase.from('students').update({
    points_balance: student.points_balance - cost
  }).eq('id', studentId);

  // Log transaction
  await supabase.from('points_transactions').insert({
    student_id: studentId,
    amount: -cost,
    type: 'spend',
    reason: 'Reward redemption — pending approval'
  });
}

/* ============================================
   MESSAGES FUNCTIONS
   ============================================ */

async function getMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:sender_id(full_name), receiver:receiver_id(full_name)`)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content });
  if (error) throw error;
  return data;
}

/* ============================================
   REWARDS STORE
   ============================================ */

async function getActiveRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('is_active', true)
    .order('cost_points');
  if (error) throw error;
  return data;
}

/* ============================================
   REAL-TIME SUBSCRIPTIONS
   ============================================ */

function subscribeToMessages(userId, callback) {
  return supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`
    }, callback)
    .subscribe();
}

function subscribeToApprovals(callback) {
  return supabase
    .channel('reward_requests')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'reward_requests'
    }, callback)
    .subscribe();
}
