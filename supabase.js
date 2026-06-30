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

function initSupabase() {
  try {
    // The Supabase UMD bundle exposes createClient in different ways
    // depending on the version. Handle all known patterns.
    var createClient = null;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      // UMD v2 standard
      createClient = window.supabase.createClient;
    } else if (window.supabaseJs && typeof window.supabaseJs.createClient === 'function') {
      createClient = window.supabaseJs.createClient;
    } else if (typeof createClient === 'undefined' && window.supabase) {
      // Some builds expose the module itself as a function
      createClient = window.supabase;
    }

    if (!createClient) {
      console.error('[Nukhba] Supabase SDK not found — check script load order');
      return;
    }

                    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: false,
      }
    });

    console.log('[Nukhba] Supabase connected');

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
          _supabaseClient.from(profileTable).select('id').eq('id', data.id).single()
            .then(function(pr) {
              var hasProfile = pr.data && !pr.error;
              setUser(data.role, data.full_name, data.id, !hasProfile);
            });
        } else {
          setUser(data.role, data.full_name, data.id,
            data.role === 'parent' ? true : false);
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
    if (!_supabaseClient) { if (onError) onError('Connection unavailable. Please refresh.'); return; }
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
    if (!_supabaseClient) { if (onError) onError('Connection unavailable. Please refresh.'); return; }
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
    State.user            = null;
    State.page            = 'landing';
    State.modal           = null;
    State.liveData        = {};
    State.dataTimestamps  = {};
    render();
  }

  return { signIn: signIn, signUp: signUp, signOut: signOut, hydrateSession: hydrateSession };
})();

/* ---- DB — ALL DATA LOADING & WRITES ---- */
var DB = (function() {

  function q(fn) {
    if (!_supabaseClient) return Promise.resolve({ data: null, error: 'No connection' });
    return fn();
  }

  /* ---- READS ---- */

  function loadStudentDashboard(userId) {
    return Promise.all([
      q(function(){ return _supabaseClient.from('students').select('*, users(full_name)').eq('id', userId).single(); }),
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
      q(function(){ return _supabaseClient.from('students').select('*, users(full_name), sessions(count)').eq('tutor_id', userId); }),
      q(function(){ return _supabaseClient.from('sessions').select('*').eq('tutor_id', userId).order('scheduled_at', { ascending: false }).limit(20); }),
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
    return q(function(){ return _supabaseClient.from('students').select('*, users(full_name), skill_map(*), sessions(*)').eq('parent_id', userId); })
      .then(function(r) { return { students: r.data || [] }; });
  }

  function loadAdminDashboard() {
    return Promise.all([
      q(function(){ return _supabaseClient.from('users').select('id, full_name, role, is_approved, created_at').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('sessions').select('*, students(id, users(full_name)), tutors(id, users(full_name))').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(20); }),
      q(function(){ return _supabaseClient.from('reward_requests').select('*, students(id, users(full_name), points_balance), rewards(name, cost_points)').eq('status', 'pending').order('created_at', { ascending: false }); }),
      q(function(){ return _supabaseClient.from('tutor_hours').select('tutor_id, session_date, hours_logged, tutors(users(full_name))'); }),
    ]).then(function(results) {
      return {
        users:          results[0].data || [],
        sessions:       results[1].data || [],
        rewardRequests: results[2].data || [],
        tutorHours:     results[3].data || [],
      };
    });
  }

  function loadRewards() {
    return q(function(){ return _supabaseClient.from('rewards').select('*').eq('is_active', true).order('cost_points'); })
      .then(function(r) { return r.data || []; });
  }

  function loadMessages(userId) {
    return q(function(){
      return _supabaseClient.from('messages')
        .select('*, sender:users!sender_id(full_name), receiver:users!receiver_id(full_name)')
        .or('sender_id.eq.' + userId + ',receiver_id.eq.' + userId)
        .order('created_at', { ascending: false })
        .limit(50);
    }).then(function(r) { return r.data || []; });
  }

  /* ---- WRITES ---- */

  function saveSessionNote(note) {
    var clean = {
      session_id:           note.session_id,
      topics_covered:       [Sanitize.text(note.topics_covered || '', 'long')].filter(Boolean),
      understanding_rating: Math.min(5, Math.max(1, parseInt(note.understanding_rating, 10) || 3)),
      flag_for_next:        Sanitize.text(note.flag_for_next || '', 'text'),
      homework_assigned:    Sanitize.text(note.homework_assigned || '', 'text'),
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

  return {
    loadStudentDashboard: loadStudentDashboard,
    loadTutorDashboard:   loadTutorDashboard,
    loadParentDashboard:  loadParentDashboard,
    loadAdminDashboard:   loadAdminDashboard,
    loadRewards:          loadRewards,
    loadMessages:         loadMessages,
    saveSessionNote:      saveSessionNote,
    awardPoints:          awardPoints,
    requestReward:        requestReward,
    resolveReward:        resolveReward,
    sendMessage:          sendMessage,
    approveUser:          approveUser,
    denyUser:             denyUser,
    markSessionComplete:  markSessionComplete,
    markStudentJoined:    markStudentJoined,
  };
})();

/* ---- REALTIME ---- */
var Realtime = (function() {
  var channels = [];
  function subscribeMessages(userId, onMessage) {
    if (!_supabaseClient) return;
    var ch = _supabaseClient.channel('messages-' + userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'receiver_id=eq.' + userId,
      }, function(payload) {
        if (onMessage) onMessage(payload.new);
      })
      .subscribe();
    channels.push(ch);
  }
  function unsubscribeAll() {
    channels.forEach(function(ch) { _supabaseClient && _supabaseClient.removeChannel(ch); });
    channels = [];
  }
  return { subscribeMessages: subscribeMessages, unsubscribeAll: unsubscribeAll };
})();

/* ---- INIT ---- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// Expose client as 'supabase' for backward compatibility with app.js
Object.defineProperty(window, 'supabaseClient', { get: function() { return _supabaseClient; } });
