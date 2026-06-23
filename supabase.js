/* ============================================
   NUKHBA — SUPABASE + AUTH + SECURITY
   ============================================
   SECURITY NOTES:
   - SUPABASE_URL and SUPABASE_KEY are the Supabase
     "anon/publishable" key, safe for frontend use.
     Row Level Security (RLS) enforces all access control.
   - No private keys, service-role keys, or secrets
     are ever stored here or committed to Git.
   - Rate limiting is enforced client-side as a UX
     guard. Supabase Auth has its own server-side
     rate limits as the true enforcement layer.
   ============================================ */

// ------------------------------------
// CONFIG — Supabase publishable key only.
// This is intentionally public (anon key).
// Real secrets (service_role key etc.) must
// only ever live in Vercel environment variables,
// never in frontend code or this file.
// ------------------------------------
const SUPABASE_URL = 'https://svndlstlmauqjrnkiisf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bvfzUDSOWBe1jnBuTqWqGw_rwTCV6gt';

var supabase = null;

function initSupabase() {
  try {
    if (typeof window !== 'undefined' && window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }
      });
      console.log('[Nukhba] Supabase connected');
      // Re-hydrate session on page load
      supabase.auth.getSession().then(function(result) {
        var session = result.data && result.data.session;
        if (session && session.user) {
          NukhbaAuth.hydrateSession(session.user);
        }
      });
    } else {
      console.warn('[Nukhba] Supabase SDK not found — running in demo mode');
    }
  } catch(e) {
    console.warn('[Nukhba] Supabase init failed, demo mode:', e.message);
  }
}

// ------------------------------------
// RATE LIMITER
// Client-side guard: max 5 attempts per 15 minutes per action.
// Supabase also enforces server-side limits — this is defence-in-depth.
// ------------------------------------
var RateLimit = (function() {
  var store = {}; // { key: [timestamp, ...] }
  var MAX_ATTEMPTS = 5;
  var WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  function check(key) {
    var now = Date.now();
    if (!store[key]) store[key] = [];
    // Remove timestamps outside the window
    store[key] = store[key].filter(function(t) { return now - t < WINDOW_MS; });
    if (store[key].length >= MAX_ATTEMPTS) {
      var oldest = store[key][0];
      var waitMs = WINDOW_MS - (now - oldest);
      var waitMin = Math.ceil(waitMs / 60000);
      return { allowed: false, wait: waitMin };
    }
    store[key].push(now);
    return { allowed: true };
  }

  function remaining(key) {
    var now = Date.now();
    if (!store[key]) return MAX_ATTEMPTS;
    store[key] = store[key].filter(function(t) { return now - t < WINDOW_MS; });
    return Math.max(0, MAX_ATTEMPTS - store[key].length);
  }

  return { check: check, remaining: remaining };
})();

// ------------------------------------
// INPUT SANITIZER
// Strips HTML, enforces length limits, validates format.
// Call before any user input touches the DB or DOM.
// ------------------------------------
var Sanitize = (function() {
  var LIMITS = {
    email:    254,
    password: 128,
    name:     80,
    text:     500,
    long:     2000,
  };

  // Strip all HTML tags and dangerous characters
  function strip(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/`/g, '&#x60;')
      .trim();
  }

  function email(val) {
    var s = strip(val).toLowerCase();
    if (s.length > LIMITS.email) return null;
    // RFC 5322 simplified
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
    return s;
  }

  function password(val) {
    if (typeof val !== 'string') return null;
    if (val.length < 8 || val.length > LIMITS.password) return null;
    return val; // Don't strip password — special chars are valid
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

// ------------------------------------
// AUTH MODULE
// Handles sign-in, sign-up, sign-out, session hydration.
// All inputs sanitized + rate limited before hitting Supabase.
// ------------------------------------
var NukhbaAuth = (function() {

  // After successful auth, load the user's DB profile and route them
  function hydrateSession(authUser) {
    if (!supabase || !authUser) return;
    supabase
      .from('users')
      .select('id, name, role, is_approved')
      .eq('id', authUser.id)
      .single()
      .then(function(result) {
        var data = result.data;
        var error = result.error;
        if (error || !data) {
          console.warn('[Auth] Could not load user profile:', error);
          toast('Could not load your profile. Please try again.', 'error');
          return;
        }
        if (!data.is_approved) {
          toast('Your account is pending admin approval. You will be notified when approved.', 'info');
          supabase.auth.signOut();
          return;
        }
        // Route to the correct portal
        setUser(data.role, data.name, data.id);
      });
  }

  function signIn(emailRaw, passwordRaw, onError) {
    // Rate limit check
    var rl = RateLimit.check('login');
    if (!rl.allowed) {
      if (onError) onError('Too many attempts. Please wait ' + rl.wait + ' minute(s) before trying again.');
      return;
    }

    // Sanitize
    var email = Sanitize.email(emailRaw);
    var password = Sanitize.password(passwordRaw);
    if (!email) { if (onError) onError('Please enter a valid email address.'); return; }
    if (!password) { if (onError) onError('Password must be 8–128 characters.'); return; }

    if (!supabase) {
      if (onError) onError('Running in demo mode — use the demo portal buttons below.');
      return;
    }

    supabase.auth.signInWithPassword({ email: email, password: password })
      .then(function(result) {
        var data = result.data;
        var error = result.error;
        if (error) {
          // Generic message — never expose Supabase internals
          if (onError) onError('Incorrect email or password.');
          return;
        }
        if (data && data.user) {
          hydrateSession(data.user);
        }
      });
  }

  function signUp(emailRaw, passwordRaw, nameRaw, roleRaw, onError) {
    var rl = RateLimit.check('signup');
    if (!rl.allowed) {
      if (onError) onError('Too many attempts. Please wait ' + rl.wait + ' minute(s).');
      return;
    }

    var email    = Sanitize.email(emailRaw);
    var password = Sanitize.password(passwordRaw);
    var fullName = Sanitize.name(nameRaw);
    var role     = ['student','tutor','parent'].includes(roleRaw) ? roleRaw : null;

    if (!email)    { if (onError) onError('Please enter a valid email address.'); return; }
    if (!password) { if (onError) onError('Password must be 8–128 characters.'); return; }
    if (!fullName) { if (onError) onError('Please enter your full name (max 80 characters).'); return; }
    if (!role)     { if (onError) onError('Please select a valid role.'); return; }

    if (!supabase) {
      if (onError) onError('Running in demo mode — sign-up is not available.');
      return;
    }

    supabase.auth.signUp({ email: email, password: password })
      .then(function(result) {
        var data = result.data;
        var error = result.error;
        if (error) {
          if (onError) onError('Could not create account. This email may already be registered.');
          return;
        }
        if (data && data.user) {
          // Insert into users table — is_approved defaults to false
          return supabase.from('users').insert([{
            id:          data.user.id,
            email:       email,
            name:        fullName,
            role:        role,
            is_approved: false,
          }]);
        }
      })
      .then(function() {
        toast('Account created! An admin will review and approve your access shortly.', 'success');
        closeModalById('login-modal');
      })
      .catch(function(err) {
        if (onError) onError('Something went wrong. Please try again.');
        console.error('[Auth] signUp error:', err);
      });
  }

  function signOut() {
    if (supabase) supabase.auth.signOut();
    State.user = null;
    State.page = 'landing';
    State.modal = null;
    render();
  }

  return { signIn: signIn, signUp: signUp, signOut: signOut, hydrateSession: hydrateSession };
})();

// ------------------------------------
// DB HELPERS
// All writes go through these — never raw .insert()/.update() in app.js.
// Each helper validates data before sending.
// ------------------------------------
var DB = (function() {

  function requireSupabase(fn) {
    if (!supabase) { console.warn('[DB] No Supabase connection'); return Promise.resolve(null); }
    return fn();
  }

  // Read current user's profile
  function getProfile(userId) {
    return requireSupabase(function() {
      return supabase.from('users').select('*').eq('id', userId).single();
    });
  }

  // Save a session note (tutor only)
  function saveSessionNote(note) {
    var clean = {
      session_id:         note.session_id,
      topics_covered:     Sanitize.text(note.topics_covered || '', 'long'),
      understanding_rating: parseInt(note.understanding_rating, 10) || 3,
      flag_for_next:      Sanitize.text(note.flag_for_next || '', 'text'),
      homework_assigned:  Sanitize.text(note.homework_assigned || '', 'text'),
      final_note:         Sanitize.text(note.final_note || '', 'long'),
      is_approved:        false,
    };
    // Reject oversized or malformed data
    if (!clean.session_id) return Promise.resolve({ error: 'Missing session ID' });
    if (clean.understanding_rating < 1 || clean.understanding_rating > 5) {
      return Promise.resolve({ error: 'Rating must be 1–5' });
    }
    return requireSupabase(function() {
      return supabase.from('session_notes').insert([clean]);
    });
  }

  // Log a points transaction (system only — not direct user writes)
  function awardPoints(studentId, amount, reason) {
    if (!Number.isInteger(amount) || amount < 0 || amount > 1000) {
      return Promise.resolve({ error: 'Invalid point amount' });
    }
    var cleanReason = Sanitize.text(reason || '', 'text');
    return requireSupabase(function() {
      return supabase.from('points_transactions').insert([{
        student_id: studentId,
        amount:     amount,
        type:       'earn',
        reason:     cleanReason,
      }]);
    });
  }

  // Submit a reward request (student only)
  function requestReward(studentId, rewardId) {
    if (!studentId || !rewardId) return Promise.resolve({ error: 'Missing fields' });
    return requireSupabase(function() {
      return supabase.from('reward_requests').insert([{
        student_id: studentId,
        reward_id:  rewardId,
        status:     'pending',
      }]);
    });
  }

  // Approve/deny a reward request (admin/tutor only)
  function resolveReward(requestId, approved) {
    if (!requestId) return Promise.resolve({ error: 'Missing request ID' });
    return requireSupabase(function() {
      return supabase
        .from('reward_requests')
        .update({ status: approved ? 'approved' : 'denied' })
        .eq('id', requestId);
    });
  }

  // Send a message (all roles)
  function sendMessage(fromId, toId, body) {
    var cleanBody = Sanitize.text(body || '', 'long');
    if (!cleanBody) return Promise.resolve({ error: 'Message cannot be empty' });
    if (!fromId || !toId) return Promise.resolve({ error: 'Missing sender or recipient' });
    return requireSupabase(function() {
      return supabase.from('messages').insert([{
        from_id: fromId,
        to_id:   toId,
        body:    cleanBody,
      }]);
    });
  }

  return {
    getProfile:      getProfile,
    saveSessionNote: saveSessionNote,
    awardPoints:     awardPoints,
    requestReward:   requestReward,
    resolveReward:   resolveReward,
    sendMessage:     sendMessage,
  };
})();

// ------------------------------------
// INIT
// ------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}
