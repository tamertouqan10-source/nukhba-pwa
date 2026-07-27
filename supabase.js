/* ============================================
   NUKHBA — SUPABASE + AUTH + SECURITY v2
   ============================================
   SECURITY NOTES:
   - SUPABASE_URL and SUPABASE_KEY are the Supabase
     anon/publishable key — safe for frontend use.
     Row Level Security (RLS) enforces all access control.
   - No private keys or secrets are ever stored here.
   - Service-role key must only live in Vercel env vars.
   ============================================ */

const SUPABASE_URL = 'https://svndlstlmauqjrnkiisf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bvfzUDSOWBe1jnBuTqWqGw_rwTCV6gt';

var _supabaseClient = null;

function initSupabase(attempt) {
  attempt = attempt || 1;
  try {
    var createClient = null;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      createClient = window.supabase.createClient;
    } else if (window.supabaseJs && typeof window.supabaseJs.createClient === 'function') {
      createClient = window.supabaseJs.createClient;
    } else if (window.supabase) {
      createClient = window.supabase;
    }

    if (!createClient) {
      if (attempt < 10) {
        setTimeout(function() { initSupabase(attempt + 1); }, 300);
      } else {
        console.error('[Nukhba] Supabase SDK not found after 10 attempts — check script load order');
      }
      return;
    }

    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: false,
      }
    });

    console.log('[Nukhba] Supabase connected (attempt ' + attempt + ')');

    _supabaseClient.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;
      if (session && session.user) {
        NukhbaAuth.hydrateSession(session.user);
      }
    });

  } catch(e) {
    console.error('[Nukhba] Supabase init failed:', e.message);
  }
}

/* ---- RATE LIMITER ---- */
var RateLimit = (function() {
  var store = {};
  var MAX   = 5;
  var WIN   = 15 * 60 * 1000;
  function check(key) {
    var now = Date.now();
    if (!store[key]) store[key] = [];
    store[key] = store[key].filter(function(t){ return now - t < WIN; });
    if (store[key].length >= MAX) {
      var wait = Math.ceil((WIN - (now - store[key][0])) / 60000);
      return { allowed: false, wait: wait };
    }
    store[key].push(now);
    return { allowed: true };
  }
  return { check: check };
})();

/* ---- SANITIZER ---- */
var Sanitize = (function() {
  var LIMITS = { email: 254, password: 128, name: 80, text: 500, long: 2000 };
  function strip(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
              .replace(/`/g,'&#x60;').trim();
  }
  function email(val) {
    var s = strip(val).toLowerCase();
    if (s.length > LIMITS.email) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
    return s;
  }
  function password(val) {
    if (typeof val !== 'string') return null;
    if (val.length < 8 || val.length > LIMITS.password) return null;
    return val;
  }
  function name(val) {
    var s = strip(val);
    if (!s || s.length > LIMITS.name) return null;
    return s;
  }
  function text(val, type) {
    var s = strip(val);
    var limit = LIMITS[type] || LIMITS.text;
    if (s.length > limit) return null;
    return s;
  }
  return { email: email, password: password, name: name, text: text, strip: strip };
})();

/* ---- AUTH MODULE ---- */
var NukhbaAuth = (function() {

  function hydrateSession(authUser) {
    if (!_supabaseClient || !authUser) return;
    // Show loading state
    var app = document.getElementById('app');
    if (app && app.innerHTML.indexOf('loading-screen') === -1) {
      app.innerHTML = '<div class="loading-screen"><div class="loading-spinner"></div><div class="loading-text">Loading your portal...</div></div>';
    }
    _supabaseClient
      .from('users')
      .select('id, full_name, role, is_approved')
      .eq('id', authUser.id)
      .single()
      .then(function(result) {
        var data  = result.data;
        var error = result.error;
        if (error || !data) {
          console.warn('[Auth] Could not load profile:', error);
          toast('Could not load your profile. Please sign in again.', 'error');
          if (app) app.innerHTML = '';
          render();
          return;
        }
        if (!data.is_approved) {
          toast('Your account is pending admin approval.', 'info');
          _supabaseClient.auth.signOut();
          if (app) app.innerHTML = '';
          render();
          return;
        }
        var profileTable = data.role === 'student' ? 'students'
                         : data.role === 'tutor'   ? 'tutors'
                         : null;
        if (profileTable) {
          _supabaseClient.from(profileTable).select('*').eq('id', data.id).single()
            .then(function(pr) {
              var hasProfile  = !!(pr.data && !pr.error);
              var newQuizDone = hasProfile
                ? (data.role === 'student' ? !!pr.data.learning_method
                 : data.role === 'tutor'   ? !!pr.data.teaching_method
                 : true)
                : false;
              setUser(data.role, data.full_name, data.id, !hasProfile || !newQuizDone);
            });
        } else {
          setUser(data.role, data.full_name, data.id, false);
        }
      });
  }

  function signIn(emailRaw, passwordRaw, onError) {
    var rl = RateLimit.check('login');
    if (!rl.allowed) {
      if (onError) onError('Too many attempts. Wait ' + rl.wait + ' minute(s).');
      return;
    }
    var email    = Sanitize.email(emailRaw);
    var password = Sanitize.password(passwordRaw);
    if (!email)    { if (onError) onError('Please enter a valid email address.'); return; }
    if (!password) { if (onError) onError('Password must be 8–128 characters.'); return; }
    if (!_supabaseClient) {
      initSupabase();
      setTimeout(function() { signIn(emailRaw, passwordRaw, onError); }, 400);
      return;
    }
    _supabaseClient.auth.signInWithPassword({ email: email, password: password })
      .then(function(result) {
        if (result.error) {
          // Check if the user exists but is pending approval
          _supabaseClient.from('users').select('is_approved').eq('email', email).single()
            .then(function(r) {
              if (r.data && r.data.is_approved === false) {
                if (onError) onError('Your account is pending admin approval. You will be notified once approved.');
              } else {
                if (onError) onError('Incorrect email or password.');
              }
            })
            .catch(function() {
              if (onError) onError('Incorrect email or password.');
            });
          return;
        }
        if (result.data && result.data.user) hydrateSession(result.data.user);
      });
  }

  function signUp(emailRaw, passwordRaw, nameRaw, roleRaw, onError) {
    var rl = RateLimit.check('signup');
    if (!rl.allowed) {
      if (onError) onError('Too many attempts. Wait ' + rl.wait + ' minute(s).');
      return;
    }
    var email    = Sanitize.email(emailRaw);
    var password = Sanitize.password(passwordRaw);
    var fullName = Sanitize.name(nameRaw);
    var role     = ['student','tutor','parent'].includes(roleRaw) ? roleRaw : null;
    if (!email)    { if (onError) onError('Please enter a valid email address.'); return; }
    if (!password) { if (onError) onError('Password must be 8–128 characters.'); return; }
    if (!fullName) { if (onError) onError('Please enter your full name.'); return; }
    if (!role)     { if (onError) onError('Please select your role.'); return; }
    if (!_supabaseClient) {
      initSupabase();
      setTimeout(function() { signUp(emailRaw, passwordRaw, nameRaw, roleRaw, onError); }, 400);
      return;
    }
    _supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName, role: role } },
    })
      .then(function(result) {
        if (result.error) {
          if (onError) onError('Could not create account. This email may already be in use.');
          return null;
        }
        if (result.data && result.data.user) {
          // Attempt direct insert as a best-effort fallback.
          // The primary path is the DB trigger (see supabase-setup.sql).
          // If email confirmation is required, auth.uid() is null here, so RLS
          // will block this insert — the trigger covers that case automatically.
          return _supabaseClient.from('users').insert([{
            id:          result.data.user.id,
            email:       email,
            full_name:   fullName,
            role:        role,
            is_approved: false,
          }]);
        }
        return null;
      })
      .then(function(insertResult) {
        if (!insertResult) return;
        if (insertResult && insertResult.error) {
          // Code 23505 = unique_violation: trigger already inserted the row, safe to ignore.
          if (insertResult.error.code !== '23505') {
            console.warn('[Auth] User insert error:', insertResult.error);
          }
        }
        // Show persistent confirmation banner instead of disappearing toast
        var modal = document.getElementById('login-modal');
        if (modal) {
          modal.querySelector('.modal').innerHTML =
            '<div id="signup-confirmed" style="text-align:center;padding:12px 0">' +
            '<div style="width:52px;height:52px;background:var(--teal-soft);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
            '<i class="ti ti-user-check" style="font-size:24px;color:var(--teal)"></i></div>' +
            '<div style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--text-1);margin-bottom:10px">Account created</div>' +
            '<div style="font-size:14px;color:var(--text-2);line-height:1.7;margin-bottom:20px">Your account for<br><strong style="color:var(--text-1)">' + email + '</strong><br><br>has been created and is pending admin approval. You will be notified once your account is approved.</div>' +
            '<button class="btn btn-primary" style="width:100%;justify-content:center" onclick="closeModalById(\'login-modal\')">Got it</button>' +
            '</div>';
        }
      })
      .catch(function(err) {
        if (onError) onError('Something went wrong. Please try again.');
        console.error('[Auth] signUp error:', err);
      });
  }

  function signOut() {
    Realtime.unsubscribeAll();
    if (_supabaseClient) _supabaseClient.auth.signOut();
    try { sessionStorage.removeItem('nukhba-page'); } catch(e) {}
    State.user            = null;
    State.page            = 'landing';
    State.modal           = null;
    State.liveData        = {};
    State.dataTimestamps  = {};
    State.notifications   = [];
    render();
  }

  // Re-authenticates with the current password before changing it, so a
  // hijacked/left-open session can't silently lock the real owner out.
  // Never logs or stores either password anywhere.
  function changePassword(currentPassword, newPassword, onError, onSuccess) {
    var rl = RateLimit.check('change-password');
    if (!rl.allowed) { if (onError) onError('Too many attempts. Wait ' + rl.wait + ' minute(s).'); return; }
    var cleanCurrent = Sanitize.password(currentPassword);
    var cleanNew     = Sanitize.password(newPassword);
    if (!cleanCurrent) { if (onError) onError('Please enter your current password.'); return; }
    if (!cleanNew)     { if (onError) onError('New password must be 8–128 characters.'); return; }
    if (!_supabaseClient) { if (onError) onError('Not connected. Please try again.'); return; }
    _supabaseClient.auth.getUser().then(function(ures) {
      var email = ures.data && ures.data.user && ures.data.user.email;
      if (!email) { if (onError) onError('Could not verify your account.'); return; }
      return _supabaseClient.auth.signInWithPassword({ email: email, password: cleanCurrent })
        .then(function(r) {
          if (r.error) { if (onError) onError('Current password is incorrect.'); return; }
          return _supabaseClient.auth.updateUser({ password: cleanNew }).then(function(ur) {
            if (ur.error) { if (onError) onError('Could not update password. Try again.'); return; }
            if (onSuccess) onSuccess();
          });
        });
    })
      .catch(function() {
        if (onError) onError('Something went wrong. Please try again.');
      });
  }

  return { signIn: signIn, signUp: signUp, signOut: signOut, hydrateSession: hydrateSession, changePassword: changePassword };
})();

/* ---- COMPATIBILITY SCORING (shared by app.js + supabase.js) ---- */
function computeCompatibility(student, tutor) {
  var studentSubjects = Array.isArray(student.subjects) ? student.subjects
                      : (student.subject ? [student.subject] : []);
  var tutorSubjects   = Array.isArray(tutor.subjects) ? tutor.subjects : [];
  // Subject: proportional overlap (how many of the student's subjects
  // this tutor covers), not binary
  var subjectScore = 0;
  if (studentSubjects.length && tutorSubjects.length) {
    var hits = studentSubjects.filter(function(s){ return tutorSubjects.indexOf(s) !== -1; }).length;
    subjectScore = Math.round((hits / studentSubjects.length) * 100);
  }
  // Pace: exact = 100, adjacent (slow<->moderate or moderate<->fast) = 50
  var paceOrder = { slow: 0, moderate: 1, fast: 2 };
  var paceScore = 0;
  if (student.pace_preference && tutor.pace &&
      paceOrder[student.pace_preference] != null && paceOrder[tutor.pace] != null) {
    var diff = Math.abs(paceOrder[student.pace_preference] - paceOrder[tutor.pace]);
    paceScore = diff === 0 ? 100 : diff === 1 ? 50 : 0;
  }
  var methodScore = (student.learning_method && student.learning_method === tutor.teaching_method) ? 100 : 0;
  var styleScore  = (student.preferred_style && student.preferred_style === tutor.tutor_style) ? 100 : 0;
  return {
    subject: subjectScore,
    pace:    paceScore,
    method:  methodScore,
    style:   styleScore,
    overall: Math.round(subjectScore * 0.45 + paceScore * 0.2 + methodScore * 0.2 + styleScore * 0.15),
  };
}

/* ---- DB — ALL DATA LOADING & WRITES ---- */
var DB = (function() {

  function q(fn) {
    if (!_supabaseClient) return Promise.resolve({ data: null, error: 'No connection' });
    return fn();
  }

  /* ---- READS ---- */

  function loadStudentDashboard(userId) {
    return Promise.all([
      q(function(){ return _supabaseClient.from('students').select('*, users!students_id_fkey(full_name), tutors(users(full_name))').eq('id', userId).single(); }),
      q(function(){ return _supabaseClient.from('sessions').select('*').eq('student_id', userId).order('scheduled_at', { ascending: false }).limit(10); }),
      q(function(){ return _supabaseClient.from('skill_map').select('*').eq('student_id', userId).order('subject'); }),
      q(function(){ return _supabaseClient.from('points_transactions').select('*').eq('student_id', userId).order('created_at', { ascending: false }).limit(20); }),
      q(function(){ return _supabaseClient.from('rewards').select('*').eq('is_active', true); }),
    ]).then(function(results) {
      return {
        student:      results[0].data,
        sessions:     results[1].data || [],
        skills:       results[2].data || [],
        transactions: results[3].data || [],
        rewards:      results[4].data || [],
      };
    });
  }

  function loadTutorDashboard(userId) {
    return Promise.all([
      q(function(){ return _supabaseClient.from('tutors').select('*, users(full_name)').eq('id', userId).single(); }),
      q(function(){ return _supabaseClient.from('students').select('*, users!students_id_fkey(full_name), sessions(count)').eq('tutor_id', userId); }),
      q(function(){ return _supabaseClient.from('sessions').select('*, students(users!students_id_fkey(full_name))').eq('tutor_id', userId).order('scheduled_at', { ascending: false }).limit(20); }),
      q(function(){ return _supabaseClient.from('tutor_hours').select('*').eq('tutor_id', userId).order('session_date', { ascending: false }); }),
    ]).then(function(results) {
      return {
        tutor:    results[0].data,
        students: results[1].data || [],
        sessions: results[2].data || [],
        hours:    results[3].data || [],
      };
    });
  }

  function loadParentDashboard(userId) {
    return Promise.all([
      q(function(){ return _supabaseClient.from('students').select('*, users!students_id_fkey(full_name), skill_map(*), sessions(*)').eq('parent_id', userId); }),
      q(function(){ return _supabaseClient.from('parent_link_requests').select('id, student_id, status, created_at, students!student_id(id, users!students_id_fkey(full_name))').eq('parent_id', userId).order('created_at', { ascending: false }); }),
    ]).then(function(results) {
      return {
        students:     results[0].data || [],
        linkRequests: results[1].data || [],
      };
    });
  }

  // Autocomplete search for the parent-linking form — resolves to a real
  // student_id, never free text. See search_unlinked_students() SQL function.
  function searchUnlinkedStudents(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) return Promise.resolve([]);
    return q(function(){
      return _supabaseClient.rpc('search_unlinked_students', { search_term: searchTerm.trim() });
    }).then(function(r) {
      if (r.error) { console.warn('[DB] search_unlinked_students error:', r.error); return []; }
      return r.data || [];
    });
  }

  function submitParentLinkRequest(parentId, studentId) {
    if (!parentId || !studentId) return Promise.resolve({ error: 'Missing required fields' });
    // Upsert so retrying the same child after a rejection flips the existing
    // row back to 'pending' instead of hitting the parent/student UNIQUE
    // constraint (RLS still only allows this when the student is unlinked).
    return q(function(){
      return _supabaseClient.from('parent_link_requests')
        .upsert([{ parent_id: parentId, student_id: studentId, status: 'pending' }], { onConflict: 'parent_id,student_id' });
    });
  }

  function adminApproveLinkRequest(requestId, parentId, studentId) {
    if (!requestId || !parentId || !studentId) return Promise.resolve({ error: 'Missing required fields' });
    return q(function(){
      return _supabaseClient.from('students').select('parent_id').eq('id', studentId).single();
    }).then(function(sr) {
      if (sr.error) return sr;
      if (sr.data && sr.data.parent_id && sr.data.parent_id !== parentId) {
        return { error: 'This student is already linked to a different parent.' };
      }
      return q(function(){
        return _supabaseClient.from('students').update({ parent_id: parentId }).eq('id', studentId);
      }).then(function(r1) {
        if (r1.error) return r1;
        return q(function(){
          return _supabaseClient.from('parent_link_requests').update({ status: 'approved' }).eq('id', requestId);
        });
      });
    });
  }

  function adminRejectLinkRequest(requestId) {
    if (!requestId) return Promise.resolve({ error: 'Missing request ID' });
    return q(function(){
      return _supabaseClient.from('parent_link_requests').update({ status: 'rejected' }).eq('id', requestId);
    });
  }

  function adminUnlinkParent(studentId) {
    if (!studentId) return Promise.resolve({ error: 'Missing student ID' });
    return q(function(){
      return _supabaseClient.from('students').update({ parent_id: null }).eq('id', studentId);
    });
  }

  function loadAdminDashboard() {
    return Promise.all([
      q(function(){ return _supabaseClient.from('users').select('id, full_name, email, role, is_approved, created_at').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('sessions').select('*, students(id, users!students_id_fkey(full_name)), tutors(id, users(full_name))').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(20); }),
      q(function(){ return _supabaseClient.from('reward_requests').select('*, students(id, users!students_id_fkey(full_name), points_balance), rewards(name, cost_points)').eq('status', 'pending').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('tutor_hours').select('tutor_id, session_date, hours_logged, tutors(users(full_name))'); }),
      q(function(){ return _supabaseClient.from('parent_link_requests').select('id, parent_id, student_id, status, created_at, parent_user:users!parent_id(full_name), student:students!student_id(id, users!students_id_fkey(full_name))').eq('status', 'pending').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('students').select('id, parent_id, parent:users!parent_id(full_name)'); }),
    ]).then(function(results) {
      return {
        users:            results[0].data || [],
        sessions:         results[1].data || [],
        rewardRequests:   results[2].data || [],
        tutorHours:       results[3].data || [],
        linkRequests:     results[4].data || [],
        studentLinks:     results[5].data || [],
      };
    });
  }

  function loadRewards() {
    return q(function(){ return _supabaseClient.from('rewards').select('*').eq('is_active', true).order('cost_points'); })
      .then(function(r) { return r.data || []; });
  }

  function loadAdminRewards() {
    return Promise.all([
      q(function(){ return _supabaseClient.from('rewards').select('*').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('reward_visibility').select('reward_id, student_id'); }),
      q(function(){ return _supabaseClient.from('users').select('id, full_name').eq('role', 'student').eq('is_approved', true).order('full_name'); }),
    ]).then(function(results) {
      return {
        rewards:    results[0].data || [],
        visibility: results[1].data || [],
        students:   results[2].data || [],
      };
    });
  }

  function createReward(name, description, costPoints) {
    var cleanName = Sanitize.name(name);
    var cleanDesc = description ? Sanitize.text(description, 'long') : null;
    if (!cleanName) return Promise.resolve({ error: 'Invalid title' });
    if (!Number.isInteger(costPoints) || costPoints < 1) return Promise.resolve({ error: 'Invalid point cost' });
    return q(function(){
      return _supabaseClient.from('rewards').insert([{
        name:        cleanName,
        description: cleanDesc,
        cost_points: costPoints,
        is_active:   true,
      }]);
    });
  }

  function setRewardVisibility(rewardId, studentIds) {
    if (!rewardId) return Promise.resolve({ error: 'Missing reward ID' });
    return q(function(){
      return _supabaseClient.from('reward_visibility').delete().eq('reward_id', rewardId);
    }).then(function(r) {
      if (r && r.error) return r;
      if (!studentIds || !studentIds.length) return { data: [] };
      var rows = studentIds.map(function(sid){ return { reward_id: rewardId, student_id: sid }; });
      return q(function(){ return _supabaseClient.from('reward_visibility').insert(rows); });
    });
  }

  function loadMessages(userId) {
    return q(function(){
      return _supabaseClient.from('messages')
        .select('*, sender:users!sender_id(full_name), receiver:users!receiver_id(full_name)')
        .or('sender_id.eq.' + userId + ',receiver_id.eq.' + userId)
        .order('created_at', { ascending: false })
        .limit(50);
    }).then(function(r) { return (r.data || []).reverse(); });
  }

  function loadAllMessages() {
    return q(function(){
      return _supabaseClient.from('messages')
        .select('*, sender:users!sender_id(full_name, role), receiver:users!receiver_id(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(500);
    }).then(function(r) { return r.data || []; });
  }

  /* ---- WRITES ---- */

  function saveSessionNote(note) {
    var clean = {
      session_id:           note.session_id,
      topics_covered:       [Sanitize.text(note.topics_covered || '', 'long')].filter(Boolean),
      understanding_rating: Math.min(5, Math.max(1, parseInt(note.understanding_rating, 10) || 3)),
      flag_for_next:        Sanitize.text(note.flag_for_next || '', 'text'),
      homework_assigned:    note.homework_assigned === true,
      final_note:           Sanitize.text(note.final_note || '', 'long'),
      is_approved:          false,
    };
    if (!clean.session_id) return Promise.resolve({ error: 'Missing session ID' });
    return q(function(){ return _supabaseClient.from('session_notes').insert([clean]); });
  }

  function awardPoints(studentId, amount, reason) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 500)
      return Promise.resolve({ error: 'Invalid point amount' });
    return q(function(){
      return _supabaseClient.from('points_transactions').insert([{
        student_id: studentId,
        amount:     amount,
        type:       'earn',
        reason:     Sanitize.text(reason || '', 'text'),
      }]);
    });
  }

  function requestReward(studentId, rewardId, costPoints) {
    if (!studentId || !rewardId || !costPoints)
      return Promise.resolve({ error: 'Missing fields' });
    return q(function(){
      return _supabaseClient.from('reward_requests').insert([{
        student_id:  studentId,
        reward_id:   rewardId,
        cost_points: costPoints,
        status:      'pending',
      }]);
    });
  }

  function resolveReward(requestId, approved, reviewerId) {
    if (!requestId) return Promise.resolve({ error: 'Missing request ID' });
    return q(function(){
      return _supabaseClient.from('reward_requests').update({
        status:      approved ? 'approved' : 'denied',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);
    });
  }

  function sendMessage(fromId, toId, content) {
    var clean = Sanitize.text(content || '', 'long');
    if (!clean)   return Promise.resolve({ error: 'Message cannot be empty' });
    if (!fromId || !toId) return Promise.resolve({ error: 'Missing users' });
    return q(function(){
      return _supabaseClient.from('messages').insert([{
        sender_id:   fromId,
        receiver_id: toId,
        content:     clean,
      }]);
    });
  }

  function approveUser(userId) {
    return q(function(){
      return _supabaseClient.from('users').update({ is_approved: true }).eq('id', userId);
    });
  }

  function denyUser(userId) {
    if (!userId) return Promise.resolve({ error: 'Missing user ID' });
    return fetch('/api/delete-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: userId }),
    })
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json && json.error) console.warn('[Auth] delete-user API:', json.error);
        return q(function(){
          return _supabaseClient.from('users').delete().eq('id', userId);
        });
      })
      .catch(function(err) {
        console.warn('[Auth] delete-user fetch failed, falling back to DB-only delete:', err);
        return q(function(){
          return _supabaseClient.from('users').delete().eq('id', userId);
        });
      });
  }

  function markSessionComplete(sessionId, studentId) {
    return q(function(){
      return _supabaseClient.from('sessions').update({
        status: 'completed',
        student_arrived_on_time: true,
      }).eq('id', sessionId);
    }).then(function(r) {
      if (!r.error) {
        awardPoints(studentId, 50, 'Attended weekly session');
        awardPoints(studentId, 10, 'Arrived on time');
      }
      return r;
    });
  }

  function markStudentJoined(sessionId) {
    if (!sessionId) return Promise.resolve({ error: 'Missing session ID' });
    return q(function(){
      return _supabaseClient.from('sessions').update({
        student_joined:    true,
        student_joined_at: new Date().toISOString(),
      }).eq('id', sessionId);
    });
  }

  function loadNotifications(userId) {
    return q(function(){
      return _supabaseClient.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
    }).then(function(r) { return r.data || []; });
  }

  function markAllNotificationsRead(userId) {
    return q(function(){
      return _supabaseClient.from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    });
  }

  function loadTutorCalendar(userId) {
    var rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 1);
    rangeStart.setDate(1);
    var startIso  = rangeStart.toISOString();
    var startDate = startIso.split('T')[0];
    return Promise.all([
      q(function(){ return _supabaseClient.from('students').select('id, users!students_id_fkey(full_name)').eq('tutor_id', userId); }),
      q(function(){ return _supabaseClient.from('sessions').select('*, students(users!students_id_fkey(full_name))').eq('tutor_id', userId).gte('scheduled_at', startIso).order('scheduled_at').limit(100); }),
      q(function(){ return _supabaseClient.from('homework').select('id, title, due_date, status, students(users!students_id_fkey(full_name))').eq('tutor_id', userId).gte('due_date', startDate).order('due_date').limit(50); }),
    ]).then(function(results) {
      return {
        students: results[0].data || [],
        sessions: results[1].data || [],
        homework: results[2].data || [],
      };
    });
  }

  function createSession(tutorId, studentId, scheduledAt, durationMinutes, meetingLink) {
    if (!tutorId || !studentId || !scheduledAt)
      return Promise.resolve({ error: 'Missing required fields' });
    var dur  = Math.min(180, Math.max(15, parseInt(durationMinutes, 10) || 60));
    var link = meetingLink ? Sanitize.strip(meetingLink).slice(0, 500) : null;
    return q(function(){
      return _supabaseClient.from('sessions').insert([{
        tutor_id:         tutorId,
        student_id:       studentId,
        scheduled_at:     scheduledAt,
        duration_minutes: dur,
        meeting_link:     link,
        status:           'upcoming',
      }]);
    });
  }

  function loadTutorHomework(userId) {
    return Promise.all([
      q(function(){ return _supabaseClient.from('students').select('id, users!students_id_fkey(full_name)').eq('tutor_id', userId); }),
      q(function(){ return _supabaseClient.from('homework').select('*, students(id, users!students_id_fkey(full_name))').eq('tutor_id', userId).order('created_at', { ascending: false }).limit(20); }),
    ]).then(function(results) {
      var homework = results[1].data || [];
      return resolveHwPhotos(homework).then(function() {
        return {
          students: results[0].data || [],
          homework: homework,
        };
      });
    });
  }

  function assignHomework(tutorId, studentId, title, description, photoFile, dueDate) {
    if (!tutorId || !studentId || !title || !dueDate)
      return Promise.resolve({ error: 'Missing required fields' });
    var cleanTitle = Sanitize.text(title, 'text');
    var cleanDesc  = description ? Sanitize.text(description, 'long') : null;
    if (!cleanTitle) return Promise.resolve({ error: 'Invalid title' });

    var photoUpload = Promise.resolve(null);
    if (photoFile) {
      var ext      = (photoFile.name || 'jpg').split('.').pop().toLowerCase();
      var safeName = tutorId + '/' + studentId + '/' + Date.now() + '.' + ext;
      photoUpload  = q(function(){
        return _supabaseClient.storage.from('homework-photos').upload(safeName, photoFile, {
          cacheControl: '3600',
          upsert: false,
        });
      }).then(function(r) {
        if (r.error) { console.warn('[DB] Photo upload error:', r.error); return null; }
        // Store the storage path, not a public URL — the bucket is private,
        // so display reads must go through resolveHwPhotoUrl (signed URL).
        return safeName;
      });
    }

    return photoUpload.then(function(photoPath) {
      return q(function(){
        return _supabaseClient.from('homework').insert([{
          tutor_id:    tutorId,
          student_id:  studentId,
          title:       cleanTitle,
          description: cleanDesc,
          photo_url:   photoPath,
          due_date:    dueDate,
          status:      'pending',
        }]);
      });
    });
  }

  // homework.photo_url / homework.student_photo_url store the storage object
  // path (not a public URL — the homework-photos bucket is private). Resolve
  // to a short-lived signed URL for display. Falls back to returning the
  // value as-is if it's already a full URL (rows saved before this change).
  function resolveHwPhotoUrl(pathOrUrl) {
    if (!pathOrUrl) return Promise.resolve(null);
    if (/^https?:\/\//i.test(pathOrUrl)) return Promise.resolve(pathOrUrl);
    return q(function(){
      return _supabaseClient.storage.from('homework-photos').createSignedUrl(pathOrUrl, 3600);
    }).then(function(r) {
      if (r.error) { console.warn('[DB] Signed URL error:', r.error); return null; }
      return (r.data && r.data.signedUrl) || null;
    });
  }

  // Resolves photo_url/student_photo_url on a list of homework rows in place.
  function resolveHwPhotos(rows) {
    return Promise.all(rows.map(function(hw) {
      return Promise.all([
        resolveHwPhotoUrl(hw.photo_url),
        resolveHwPhotoUrl(hw.student_photo_url),
      ]).then(function(urls) {
        hw.photo_url         = urls[0];
        hw.student_photo_url = urls[1];
        return hw;
      });
    }));
  }

  function loadStudentMatches(userId) {
    return q(function(){
      return _supabaseClient
        .from('match_scores')
        .select('overall_score, tutors(id, bio, subjects, teacher_reference, users(full_name))')
        .eq('student_id', userId)
        .order('overall_score', { ascending: false })
        .limit(10);
    }).then(function(r) { return r.data || []; });
  }

  function loadStudentMatchesComputed(userId) {
    return Promise.all([
      q(function(){
        return _supabaseClient.from('students')
          .select('*')
          .eq('id', userId)
          .single();
      }),
      q(function(){
        return _supabaseClient.from('tutors')
          .select('*, users(full_name)');
      }),
    ]).then(function(results) {
      if (results[0].error) console.warn('[Match] student profile read failed:', results[0].error);
      if (results[1].error) console.warn('[Match] tutors read failed:', results[1].error);
      var student = results[0].data;
      var allTutors = results[1].data || [];
      // Filter out tutors who paused new students (client-side, safe if column missing)
      var tutors = allTutors.filter(function(t){ return t.accepting_new_students !== false; });
      if (!student) return tutors.map(function(t){ return { tutor: t, score: 0 }; });
      return tutors.map(function(t) {
        var c = computeCompatibility(student, t);
        return { tutor: t, score: c.overall, breakdown: c };
      }).sort(function(a, b){ return b.score - a.score; });
    });
  }

  function loadStudentMatchRequests(studentId) {
    return q(function(){
      return _supabaseClient
        .from('match_requests')
        .select('id, tutor_id, status')
        .eq('student_id', studentId);
    }).then(function(r) { return r.data || []; });
  }

  function loadTutorMatchRequests(tutorId) {
    return q(function(){
      return _supabaseClient
        .from('match_requests')
        .select('id, student_id, tutor_id, status, created_at, students(grade, subjects, users!students_id_fkey(full_name))')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });
    }).then(function(r) { return r.data || []; });
  }

  function sendMatchRequest(studentId, tutorId) {
    if (!studentId || !tutorId) return Promise.resolve({ error: 'Missing IDs' });
    return q(function(){
      return _supabaseClient
        .from('match_requests')
        .upsert([{ student_id: studentId, tutor_id: tutorId, status: 'pending', updated_at: new Date().toISOString() }], { onConflict: 'student_id,tutor_id' });
    });
  }

  function cancelMatchRequest(studentId, tutorId) {
    if (!studentId || !tutorId) return Promise.resolve({ error: 'Missing IDs' });
    return q(function(){
      return _supabaseClient.from('match_requests')
        .delete()
        .eq('student_id', studentId)
        .eq('tutor_id', tutorId)
        .eq('status', 'pending');
    });
  }

  function respondToMatchRequest(requestId, newStatus, studentId, tutorId) {
    if (!requestId) return Promise.resolve({ error: 'Missing request ID' });
    return q(function(){
      return _supabaseClient
        .from('match_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);
    }).then(function(r) {
      if ((r && r.error) || newStatus !== 'accepted') return r;
      return q(function(){
        return _supabaseClient
          .from('students')
          .update({ tutor_id: tutorId })
          .eq('id', studentId);
      });
    });
  }

  function unmatchPair(studentId, tutorId) {
    if (!studentId || !tutorId) return Promise.resolve({ error: 'Missing IDs' });
    return q(function(){
      return _supabaseClient.from('students').update({ tutor_id: null }).eq('id', studentId);
    }).then(function(r1) {
      if (r1 && r1.error) return r1;
      return q(function(){
        return _supabaseClient.from('match_requests')
          .update({ status: 'ended', updated_at: new Date().toISOString() })
          .eq('student_id', studentId).eq('tutor_id', tutorId).eq('status', 'accepted');
      });
    }).then(function(r2) {
      if (r2 && r2.error) return r2;
      return q(function(){
        return _supabaseClient.from('sessions')
          .update({ status: 'cancelled' })
          .eq('student_id', studentId).eq('tutor_id', tutorId).eq('status', 'upcoming');
      });
    });
  }

  function loadStudentHomework(userId) {
    return q(function(){
      return _supabaseClient
        .from('homework')
        .select('*, tutors(users(full_name))')
        .eq('student_id', userId)
        .order('due_date')
        .limit(50);
    }).then(function(r) {
      var homework = r.data || [];
      return resolveHwPhotos(homework).then(function() { return homework; });
    });
  }

  // Used for both the initial submission and later edits — always an UPDATE
  // on the one existing homework row (never a second/duplicate row).
  function submitStudentHomework(hwId, studentId, studentNote, photoFile) {
    if (!hwId || !studentId) return Promise.resolve({ error: 'Missing required fields' });
    var clean = studentNote ? Sanitize.text(studentNote, 'long') : null;

    var photoUpload = Promise.resolve(null);
    if (photoFile) {
      var ext      = (photoFile.name || 'jpg').split('.').pop().toLowerCase();
      var safeName = 'student-submissions/' + studentId + '/' + hwId + '-' + Date.now() + '.' + ext;
      photoUpload  = q(function(){
        return _supabaseClient.storage.from('homework-photos').upload(safeName, photoFile, {
          cacheControl: '3600',
          upsert: false,
        });
      }).then(function(r) {
        if (r.error) { console.warn('[DB] Submission photo upload error:', r.error); return null; }
        // Store the storage path, not a public URL — see resolveHwPhotoUrl.
        return safeName;
      });
    }

    return photoUpload.then(function(photoPath) {
      var update = { status: 'submitted', submitted_at: new Date().toISOString(), student_note: clean };
      if (photoPath) update.student_photo_url = photoPath; // keep existing photo if none re-attached on edit
      return q(function(){
        return _supabaseClient.from('homework').update(update).eq('id', hwId).eq('student_id', studentId).select();
      }).then(function(r) {
        // RLS silently no-ops a blocked UPDATE (0 rows, no error) — e.g. the
        // deadline has passed — so surface that as an explicit error instead
        // of the caller reporting a false "submitted" success.
        if (!r.error && (!r.data || !r.data.length)) {
          return { error: 'This homework can no longer be edited — the deadline may have passed.' };
        }
        return r;
      });
    });
  }

  function withdrawStudentHomework(hwId, studentId) {
    if (!hwId || !studentId) return Promise.resolve({ error: 'Missing required fields' });
    return q(function(){
      return _supabaseClient.from('homework').update({
        status: 'pending',
        student_note: null,
        student_photo_url: null,
        submitted_at: null,
      }).eq('id', hwId).eq('student_id', studentId).select();
    }).then(function(r) {
      if (!r.error && (!r.data || !r.data.length)) {
        return { error: 'This submission can no longer be withdrawn — the deadline may have passed.' };
      }
      return r;
    });
  }

  function toggleAcceptingStudents(tutorId, accepting) {
    if (!tutorId) return Promise.resolve({ error: 'Missing tutor ID' });
    return q(function(){
      return _supabaseClient.from('tutors').update({ accepting_new_students: accepting }).eq('id', tutorId);
    });
  }

  function loadStudentCalendar(userId) {
    var rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 1);
    rangeStart.setDate(1);
    var startIso  = rangeStart.toISOString();
    var startDate = startIso.split('T')[0];
    return Promise.all([
      q(function(){ return _supabaseClient.from('sessions').select('*').eq('student_id', userId).gte('scheduled_at', startIso).order('scheduled_at').limit(100); }),
      q(function(){ return _supabaseClient.from('homework').select('*, tutors(users(full_name))').eq('student_id', userId).gte('due_date', startDate).order('due_date').limit(50); }),
    ]).then(function(results) {
      return {
        sessions: results[0].data || [],
        homework: results[1].data || [],
      };
    });
  }

  function getStudentTutorId(studentId) {
    return q(function(){
      return _supabaseClient.from('students').select('tutor_id').eq('id', studentId).single();
    }).then(function(r) { return (r.data && r.data.tutor_id) || null; });
  }

  function loadTutorRecipients(tutorId) {
    return q(function(){
      return _supabaseClient.from('students')
        .select('id, parent_id, users!students_id_fkey(full_name)')
        .eq('tutor_id', tutorId);
    }).then(function(r) {
      var students = r.data || [];
      var parentIds = students.map(function(s){ return s.parent_id; }).filter(Boolean);
      if (!parentIds.length) return { students: students, parents: [] };
      return q(function(){
        return _supabaseClient.from('users').select('id, full_name').in('id', parentIds);
      }).then(function(pr) {
        return { students: students, parents: pr.data || [] };
      });
    });
  }

  return {
    loadStudentDashboard: loadStudentDashboard,
    loadTutorDashboard:   loadTutorDashboard,
    loadParentDashboard:  loadParentDashboard,
    loadAdminDashboard:   loadAdminDashboard,
    loadRewards:          loadRewards,
    loadAdminRewards:     loadAdminRewards,
    createReward:         createReward,
    setRewardVisibility:  setRewardVisibility,
    loadMessages:         loadMessages,
    loadAllMessages:      loadAllMessages,
    saveSessionNote:      saveSessionNote,
    awardPoints:          awardPoints,
    requestReward:        requestReward,
    resolveReward:        resolveReward,
    sendMessage:          sendMessage,
    approveUser:          approveUser,
    denyUser:             denyUser,
    markSessionComplete:  markSessionComplete,
    markStudentJoined:    markStudentJoined,
    loadTutorCalendar:          loadTutorCalendar,
    createSession:              createSession,
    loadTutorHomework:          loadTutorHomework,
    assignHomework:             assignHomework,
    loadNotifications:          loadNotifications,
    markAllNotificationsRead:   markAllNotificationsRead,
    loadStudentMatches:           loadStudentMatches,
    loadStudentMatchesComputed:   loadStudentMatchesComputed,
    loadStudentMatchRequests:     loadStudentMatchRequests,
    loadTutorMatchRequests:     loadTutorMatchRequests,
    sendMatchRequest:           sendMatchRequest,
    cancelMatchRequest:         cancelMatchRequest,
    respondToMatchRequest:      respondToMatchRequest,
    unmatchPair:                unmatchPair,
    loadStudentHomework:        loadStudentHomework,
    submitStudentHomework:      submitStudentHomework,
    withdrawStudentHomework:    withdrawStudentHomework,
    toggleAcceptingStudents:    toggleAcceptingStudents,
    loadStudentCalendar:        loadStudentCalendar,
    getStudentTutorId:          getStudentTutorId,
    loadTutorRecipients:        loadTutorRecipients,
    searchUnlinkedStudents:     searchUnlinkedStudents,
    submitParentLinkRequest:    submitParentLinkRequest,
    adminApproveLinkRequest:    adminApproveLinkRequest,
    adminRejectLinkRequest:     adminRejectLinkRequest,
    adminUnlinkParent:          adminUnlinkParent,
  };
})();

/* ---- REALTIME ---- */
var Realtime = (function() {
  var channels = {};
  function subscribe(key, table, filterCol, userId, cb) {
    if (!_supabaseClient) return;
    var k = key + '-' + userId;
    if (channels[k]) return; // already subscribed
    channels[k] = _supabaseClient.channel(k)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: table,
        filter: filterCol + '=eq.' + userId,
      }, function(payload) {
        console.log('[Realtime] INSERT received on ' + k, payload.new); // TEMP — remove once confirmed live in prod
        if (cb) cb(payload.new);
      })
      .subscribe(function(status, err) {
        console.log('[Realtime] ' + k + ' status:', status, err || '');
        // Let a future subscribe() call retry instead of staying silently broken forever.
        // Must actually remove the channel (not just forget it here), otherwise the
        // errored channel keeps its own internal reconnect/callback wiring alive and
        // a later resubscribe stacks a second live channel on the same topic.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          _supabaseClient.removeChannel(channels[k]);
          delete channels[k];
        }
      });
  }
  function subscribeMessages(userId, onMessage) {
    subscribe('messages', 'messages', 'receiver_id', userId, onMessage);
  }
  function subscribeNotifications(userId, onNotification) {
    subscribe('notifications', 'notifications', 'user_id', userId, onNotification);
  }
  function unsubscribeAll() {
    Object.keys(channels).forEach(function(k) {
      _supabaseClient && _supabaseClient.removeChannel(channels[k]);
    });
    channels = {};
  }
  return { subscribeMessages: subscribeMessages, subscribeNotifications: subscribeNotifications, unsubscribeAll: unsubscribeAll };
})();

/* ---- INIT ---- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// Expose client as 'supabase' for backward compatibility with app.js
Object.defineProperty(window, 'supabaseClient', { get: function() { return _supabaseClient; } });
