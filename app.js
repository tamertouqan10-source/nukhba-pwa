/* ============================================
   NUKHBA — PWA v2 — Real Data
   ============================================ */

/* ---- STATE ---- */
const State = {
  user:             null,
  page:             'landing',
  modal:            null,
  liveData:         {},   // Loaded from Supabase per page
  loading:          {},   // Per-page loading flags
  dataTimestamps:   {},   // { source: timestampMs } for 30-second cache
  notifications:    [],   // In-app notifications for current user
  gated:            false,
  onboarding:       { step: 1, data: {} },
  checklistChecked: new Set(),
  calState:         {},   // { [calKey]: { y, m } } for month calendar navigation
  calEvents:        {},   // { [calKey]: [{date, label, type, time, link}] }
};

/* ---- HELPERS ---- */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2);
}

function timeAgo(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  var m = Math.floor(diff/60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return m + 'm ago';
  var h = Math.floor(m/60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h/24) + 'd ago';
}

function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ---- ROUTER ---- */
function navigate(page) {
  if (State.page === 'onboarding') return;
  if (State.gated && State.user && State.user.role === 'student' && page !== 'student-matches') {
    toast('Apply to at least one tutor to unlock the rest of your portal.', 'info');
    return;
  }
  State.page = page;
  render();
  loadPageData(page);
  window.scrollTo(0,0);
}

function openModal(name) {
  State.modal = name;
  render();
}

function closeModal() {
  State.modal = null;
  render();
}

function closeModalById(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
  if (id === 'login-modal') State.modal = null;
}

function setUser(role, name, id, needsOnboarding) {
  State.user = { role: role, name: name, id: id || null };
  State.modal = null;
  var loginModal = document.getElementById('login-modal');
  if (loginModal) loginModal.remove();
  State.onboarding      = { step: 1, data: {} };
  State.liveData        = {};
  State.dataTimestamps  = {};
  State.notifications   = [];
  if (needsOnboarding && role !== 'admin') {
    State.page = 'onboarding';
  } else {
    State.page = role + '-dashboard';
  }
  if (id) {
    Realtime.subscribeNotifications(id, function(notif) {
      State.notifications.unshift(notif);
      render();
    });
  }
  render();
  if (!needsOnboarding) loadPageData(State.page);
  loadNotifications();
  if (role === 'student' && !needsOnboarding) checkStudentGate();
}

/* ---- DATA LOADER ---- */
function loadPageData(page) {
  if (!State.user || !State.user.id) return;
  var uid  = State.user.id;
  var role = State.user.role;

  var loaders = {
    'student-dashboard': function() {
      if (useCachedIfAvailable(page, 'student')) return;
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('student');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-sessions': function() {
      if (useCachedIfAvailable(page, 'student')) return;
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('student');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-progress': function() {
      if (useCachedIfAvailable(page, 'student')) return;
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('student');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-points': function() {
      if (useCachedIfAvailable(page, 'student')) return;
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('student');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-messages': function() {
      setLoading(page, true);
      Promise.all([DB.loadMessages(uid), DB.getStudentTutorId(uid)])
        .then(function(results) {
          State.liveData[page] = { messages: results[0], tutorId: results[1] };
          setLoading(page, false);
          if (State.page === page) render();
          Realtime.subscribeMessages(uid, function(msg) {
            var d = State.liveData['student-messages'];
            if (d && d.messages) d.messages.unshift(msg);
            if (State.page === 'student-messages') render();
          });
        }).catch(function(){ setLoading(page, false); });
    },
    'tutor-dashboard': function() {
      if (useCachedIfAvailable(page, 'tutor')) return;
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('tutor');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-students': function() {
      if (useCachedIfAvailable(page, 'tutor')) return;
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('tutor');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-hours': function() {
      if (useCachedIfAvailable(page, 'tutor')) return;
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('tutor');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-dashboard': function() {
      if (useCachedIfAvailable(page, 'parent')) return;
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('parent');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-dashboard': function() {
      if (useCachedIfAvailable(page, 'admin')) return;
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('admin');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-students': function() {
      if (useCachedIfAvailable(page, 'admin')) return;
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('admin');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-approvals': function() {
      if (useCachedIfAvailable(page, 'admin')) return;
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('admin');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-hours': function() {
      if (useCachedIfAvailable(page, 'admin')) return;
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('admin');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-tutors': function() {
      if (useCachedIfAvailable(page, 'admin')) return;
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('admin');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-progress': function() {
      if (useCachedIfAvailable(page, 'parent')) return;
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('parent');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-sessions': function() {
      if (useCachedIfAvailable(page, 'parent')) return;
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setCacheTimestamp('parent');
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-messages': function() {
      setLoading(page, true);
      Promise.all([
        DB.loadMessages(uid),
        DB.loadParentDashboard(uid),
      ]).then(function(results) {
        var child = (results[1].students || [])[0] || {};
        State.liveData[page] = { messages: results[0], tutorId: child.tutor_id || null };
        setLoading(page, false);
        if (State.page === page) render();
        Realtime.subscribeMessages(uid, function(msg) {
          var d = State.liveData['parent-messages'];
          if (d && d.messages) d.messages.unshift(msg);
          if (State.page === 'parent-messages') render();
        });
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-homework': function() {
      setLoading(page, true);
      DB.loadTutorHomework(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-calendar': function() {
      setLoading(page, true);
      DB.loadTutorCalendar(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-messages': function() {
      setLoading(page, true);
      Promise.all([DB.loadMessages(uid), DB.loadTutorRecipients(uid)])
        .then(function(results) {
          State.liveData[page] = {
            messages: results[0],
            students: results[1].students || [],
            parents:  results[1].parents  || [],
          };
          setLoading(page, false);
          if (State.page === page) render();
          Realtime.subscribeMessages(uid, function(msg) {
            var d = State.liveData['tutor-messages'];
            if (d && d.messages) d.messages.unshift(msg);
            if (State.page === 'tutor-messages') render();
          });
        }).catch(function(){ setLoading(page, false); });
    },
    'student-calendar': function() {
      setLoading(page, true);
      DB.loadStudentCalendar(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-homework': function() {
      setLoading(page, true);
      DB.loadStudentHomework(uid).then(function(hw) {
        State.liveData[page] = { homework: hw };
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-matches': function() {
      setLoading(page, true);
      Promise.all([
        DB.loadStudentMatchesComputed(uid),
        DB.loadStudentMatchRequests(uid),
      ]).then(function(results) {
        State.liveData[page] = { matches: results[0], requests: results[1] };
        setLoading(page, false);
        if (State.page === page) render();
        runMatchEngine(uid); // background analytics upsert
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-notes': function() {
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-requests': function() {
      setLoading(page, true);
      DB.loadTutorMatchRequests(uid).then(function(requests) {
        State.liveData[page] = { requests: requests };
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
  };

  if (loaders[page]) loaders[page]();
}

function setLoading(page, val) {
  State.loading[page] = val;
}

function isLoading(page) {
  return !!State.loading[page];
}

/* ---- DATA CACHE ---- */
var CACHE_TTL = 30 * 1000; // 30 seconds

var PAGE_DATA_SOURCE = {
  'student-dashboard': 'student',
  'student-sessions':  'student',
  'student-progress':  'student',
  'student-points':    'student',
  'tutor-dashboard':   'tutor',
  'tutor-students':    'tutor',
  'tutor-hours':       'tutor',
  'parent-dashboard':  'parent',
  'parent-progress':   'parent',
  'parent-sessions':   'parent',
  'admin-dashboard':   'admin',
  'admin-students':    'admin',
  'admin-approvals':   'admin',
  'admin-hours':       'admin',
  'admin-tutors':      'admin',
};

function isCacheValid(source) {
  var ts = State.dataTimestamps[source];
  return !!ts && (Date.now() - ts < CACHE_TTL);
}

function setCacheTimestamp(source) {
  State.dataTimestamps[source] = Date.now();
}

function bustCache(source) {
  State.dataTimestamps[source] = 0;
}

function useCachedIfAvailable(page, source) {
  if (!isCacheValid(source)) return false;
  var siblings = Object.keys(PAGE_DATA_SOURCE).filter(function(p) {
    return PAGE_DATA_SOURCE[p] === source && State.liveData[p];
  });
  if (!siblings.length) return false;
  State.liveData[page] = State.liveData[siblings[0]];
  if (State.page === page) render();
  return true;
}

/* ---- STUDENT GATE ---- */
function checkStudentGate() {
  var uid = State.user && State.user.id;
  if (!uid || State.user.role !== 'student') { State.gated = false; return; }
  Promise.all([
    _supabaseClient.from('students').select('tutor_id').eq('id', uid).single(),
    _supabaseClient.from('match_requests').select('id', { count: 'exact', head: true }).eq('student_id', uid),
  ]).then(function(results) {
    var hasTutor   = !!(results[0].data && results[0].data.tutor_id);
    var hasRequest = (results[1].count || 0) > 0;
    var wasGated   = State.gated;
    State.gated = !hasTutor && !hasRequest;
    if (State.gated && State.page !== 'onboarding') {
      State.page = 'student-matches';
      render();
      loadPageData('student-matches');
    } else if (wasGated !== State.gated) {
      render();
    }
  }).catch(function(){});
}

/* ---- NOTIFICATIONS ---- */
function loadNotifications() {
  var uid = State.user && State.user.id;
  if (!uid) return;
  DB.loadNotifications(uid).then(function(notifs) {
    State.notifications = notifs;
    render();
  }).catch(function(){});
}

function toggleNotificationsDropdown() {
  var existing = document.getElementById('notif-dropdown');
  if (existing) { existing.remove(); return; }

  var notifs = State.notifications || [];
  var hasUnread = notifs.some(function(n){ return !n.is_read; });

  var typeIcon = function(type) {
    return type.indexOf('session') > -1 ? 'ti-calendar' : 'ti-books';
  };

  var html = '<div id="notif-dropdown" style="position:fixed;top:56px;right:16px;width:320px;max-height:400px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:2000">';
  html += '<div style="padding:14px 16px 10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface)">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text-1)">Notifications</div>';
  if (hasUnread) {
    html += '<button class="btn btn-ghost" style="font-size:12px;padding:4px 8px" onclick="markAllNotificationsRead()">Mark all read</button>';
  }
  html += '</div>';

  if (!notifs.length) {
    html += '<div style="padding:32px 16px;text-align:center;color:var(--text-3);font-size:13px"><i class="ti ti-bell-off" style="font-size:28px;display:block;margin-bottom:8px;color:var(--text-3)"></i>No notifications yet</div>';
  } else {
    html += notifs.map(function(n) {
      var bg = n.is_read ? '' : 'background:var(--accent-soft);';
      return '<div style="' + bg + 'padding:12px 16px;display:flex;gap:10px;align-items:flex-start;border-bottom:1px solid var(--border)">' +
        '<i class="ti ' + typeIcon(n.type) + '" style="font-size:16px;color:var(--accent);margin-top:1px;flex-shrink:0"></i>' +
        '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--text-1);line-height:1.4">' + esc(n.message) + '</div>' +
        '<div style="font-size:11px;color:var(--text-3);margin-top:3px">' + timeAgo(n.created_at) + '</div></div>' +
        (n.is_read ? '' : '<div style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:5px"></div>') +
        '</div>';
    }).join('');
  }
  html += '</div>';

  document.body.insertAdjacentHTML('beforeend', html);

  setTimeout(function() {
    document.addEventListener('click', function _close(e) {
      var dd = document.getElementById('notif-dropdown');
      if (dd && !dd.contains(e.target)) {
        dd.remove();
        document.removeEventListener('click', _close);
      }
    });
  }, 0);
}

function markAllNotificationsRead() {
  var uid = State.user && State.user.id;
  var dd  = document.getElementById('notif-dropdown');
  if (dd) dd.remove();
  DB.markAllNotificationsRead(uid).then(function() {
    State.notifications = (State.notifications || []).map(function(n) {
      return Object.assign({}, n, { is_read: true });
    });
    render();
  }).catch(function(){});
}

/* ---- TOAST ---- */
function toast(msg, type) {
  type = type || 'success';
  var icons = { success: 'ti-circle-check', error: 'ti-alert-circle', info: 'ti-info-circle' };
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="ti ' + (icons[type]||icons.info) + '"></i><span>' + esc(msg) + '</span>';
  var container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  container.appendChild(el);
  setTimeout(function(){ el.remove(); }, 3500);
}

/* ---- CHECKLIST ---- */
function toggleCheck(id) {
  if (State.checklistChecked.has(id)) State.checklistChecked.delete(id);
  else State.checklistChecked.add(id);
  var item = document.querySelector('[data-check="' + id + '"]');
  if (item) {
    item.classList.toggle('checked', State.checklistChecked.has(id));
    item.querySelector('.checklist-cb').innerHTML =
      State.checklistChecked.has(id) ? '<i class="ti ti-check"></i>' : '';
  }
}

/* ---- COMPONENTS ---- */
function Avatar(name, color, size) {
  color = color || 'purple';
  size  = size  || 34;
  var colors = {
    purple: 'background:var(--accent-soft);color:var(--accent)',
    green:  'background:var(--teal-soft);color:var(--teal)',
    amber:  'background:var(--amber-soft);color:var(--amber)',
    red:    'background:var(--danger-soft);color:var(--danger)',
  };
  return '<div class="user-av ' + color + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.floor(size*0.35) + 'px;' + (colors[color]||colors.purple) + '">' + esc(initials(name)) + '</div>';
}

function Badge(text, type) {
  type = type || 'v';
  return '<span class="badge badge-' + type + '">' + esc(text) + '</span>';
}

function PendingBadge() {
  return '<span class="badge badge-a" style="display:inline-flex;align-items:center;gap:3px"><i class="ti ti-clock-hour-4" style="font-size:11px"></i>Pending</span>';
}

function ProgressBar(pct, type, height) {
  pct    = Math.min(100, Math.max(0, pct || 0));
  type   = type   || 'accent';
  height = height || 6;
  var colorMap = { accent: 'accent', mastered: 'teal', progress: 'amber', grad: 'grad' };
  var fill = colorMap[type] || (pct > 75 ? 'teal' : pct > 40 ? 'amber' : 'danger');
  return '<div class="progress-wrap" style="height:' + height + 'px"><div class="progress-fill ' + fill + '" style="width:' + pct + '%"></div></div>';
}

function StatusBadge(status) {
  var map = {
    'upcoming':  Badge('Upcoming','v'),
    'completed': Badge('Completed','g'),
    'cancelled': Badge('Cancelled','r'),
    'no-show':   Badge('No-show','r'),
    'on-track':  Badge('On track','g'),
    'attention': Badge('Needs attention','a'),
    'stalled':   Badge('Stalled','r'),
    'confirmed': Badge('Confirmed','g'),
    'at-risk':   Badge('At risk','r'),
    'pending':   PendingBadge(),
    'approved':  Badge('Approved','g'),
    'denied':    Badge('Denied','r'),
  };
  return map[status] || Badge(status || '—','gray');
}

function sessionAttendanceBadge(s) {
  if (s.status === 'completed') return StatusBadge('completed');
  if (s.status !== 'upcoming')  return StatusBadge(s.status);
  if (s.student_joined) {
    var joinText = 'Joined session' + (s.student_joined_at ? ' · ' + formatTime(s.student_joined_at) : '');
    return Badge(joinText, 'g');
  }
  var now    = Date.now();
  var sessAt = new Date(s.scheduled_at).getTime();
  if (now > sessAt + 10 * 60 * 1000) return Badge('Has not joined yet', 'r');
  return StatusBadge('upcoming');
}

function Spinner() {
  return '<div style="display:flex;align-items:center;justify-content:center;padding:60px"><div class="loading-spinner"></div></div>';
}

function EmptyState(icon, msg) {
  return '<div class="empty-state"><i class="ti ' + icon + '"></i><p>' + esc(msg) + '</p></div>';
}

/* ---- CALENDAR HELPERS ---- */
function padZ(n) { return n < 10 ? '0' + n : '' + n; }

function getCalState(key) {
  if (!State.calState[key]) {
    var now = new Date();
    State.calState[key] = { y: now.getFullYear(), m: now.getMonth() };
  }
  return State.calState[key];
}

function calNav(key, delta) {
  var cs = getCalState(key);
  cs.m += delta;
  if (cs.m > 11) { cs.m = 0; cs.y++; }
  if (cs.m < 0)  { cs.m = 11; cs.y--; }
  render();
}

function calDayClick(key, dateStr) {
  var existing = document.getElementById('cal-popup');
  if (existing && existing.getAttribute('data-date') === dateStr) { existing.remove(); return; }
  if (existing) existing.remove();

  var events = (State.calEvents && State.calEvents[key]) || [];
  var dayEvents = events.filter(function(e){ return e.date === dateStr; });
  if (!dayEvents.length) return;

  var d     = new Date(dateStr + 'T12:00:00');
  var label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  var html = '<div id="cal-popup" data-date="'+dateStr+'" style="margin-top:12px;padding:14px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md)">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text-1)">'+esc(label)+'</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'cal-popup\').remove()"><i class="ti ti-x"></i></button>';
  html += '</div>';
  dayEvents.forEach(function(e) {
    html += '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px;background:var(--surface);border:1px solid var(--border-2);border-radius:6px;margin-bottom:6px">';
    html += '<div style="width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:'+(e.type==='session'?'var(--teal)':'var(--amber)')+'"></div>';
    html += '<div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--text-1)">'+esc(e.label)+'</div>';
    if (e.time) html += '<div style="font-size:11px;color:var(--text-3);margin-top:2px">'+esc(e.time)+'</div>';
    if (e.link) {
      html += '<div style="display:flex;gap:6px;margin-top:6px">';
      html += '<a class="btn btn-primary btn-sm" href="'+esc(e.link)+'" target="_blank" rel="noopener" style="display:inline-flex"><i class="ti ti-video"></i> Join session</a>';
      html += '<button class="btn btn-secondary btn-sm" onclick="copySessionLink(this)" data-link="'+esc(e.link)+'"><i class="ti ti-copy"></i> Copy link</button>';
      html += '</div>';
    }
    html += '</div></div>';
  });
  html += '</div>';

  var calWrap = document.querySelector('.cal-container');
  if (calWrap) calWrap.insertAdjacentHTML('afterend', html);
}

function copySessionLink(btn) {
  var link = btn.getAttribute('data-link');
  if (!link) { toast('No link to copy.','error'); return; }
  function fallback() {
    try {
      var ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) toast('Link copied.','success');
      else toast('Could not copy link.','error');
    } catch(e) { toast('Could not copy link.','error'); }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link)
      .then(function(){ toast('Link copied.','success'); })
      .catch(fallback);
  } else {
    fallback();
  }
}

function buildMonthGrid(events, calKey) {
  State.calEvents[calKey] = events;
  var cs = getCalState(calKey);
  var y = cs.y, m = cs.m;
  var now = new Date();
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var startDay    = new Date(y, m, 1).getDay();

  var evtMap = {};
  events.forEach(function(e) {
    if (!evtMap[e.date]) evtMap[e.date] = [];
    evtMap[e.date].push(e);
  });

  var html = '<div class="cal-container">';
  html += '<div class="cal-nav">';
  html += '<button class="btn btn-secondary btn-sm" onclick="calNav(\''+calKey+'\',-1)"><i class="ti ti-chevron-left"></i></button>';
  html += '<div class="cal-month-label">'+MONTHS[m]+' '+y+'</div>';
  html += '<button class="btn btn-secondary btn-sm" onclick="calNav(\''+calKey+'\',1)"><i class="ti ti-chevron-right"></i></button>';
  html += '</div>';
  html += '<div class="cal-grid">';
  DAYS.forEach(function(dn){ html += '<div class="cal-day-hdr">'+dn+'</div>'; });
  for (var i = 0; i < startDay; i++) { html += '<div class="cal-cell other-month"></div>'; }
  for (var d = 1; d <= daysInMonth; d++) {
    var ds   = y + '-' + padZ(m + 1) + '-' + padZ(d);
    var evts = evtMap[ds] || [];
    var isToday = (now.getFullYear() === y && now.getMonth() === m && now.getDate() === d);
    var cls  = 'cal-cell' + (isToday ? ' today' : '') + (evts.length ? ' has-events' : '');
    var attrs = evts.length ? ' onclick="calDayClick(\''+calKey+'\',\''+ds+'\')"' : '';
    html += '<div class="'+cls+'"'+attrs+'>';
    html += '<div class="cal-day-num">'+d+'</div>';
    evts.slice(0, 3).forEach(function(e){
      html += '<div class="cal-pill cal-pill-'+e.type+'">'+esc(e.label.slice(0, 22))+'</div>';
    });
    if (evts.length > 3) html += '<div class="cal-pill-more">+' + (evts.length - 3) + ' more</div>';
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

/* ---- MESSAGE COMPOSER ---- */
function sendMsg() {
  var compose = document.getElementById('msg-compose');
  var input   = document.getElementById('msg-input');
  if (!compose || !input) return;
  var toId    = compose.getAttribute('data-to');
  var content = (input.value || '').trim();
  if (!content) return;
  if (!toId) { toast('No recipient configured.', 'error'); return; }
  var uid = State.user && State.user.id;
  if (!uid) return;
  input.disabled = true;
  DB.sendMessage(uid, toId, content).then(function(r) {
    input.disabled = false;
    if (r && r.error) { toast('Could not send message. Try again.', 'error'); return; }
    var d = State.liveData[State.page];
    if (d && Array.isArray(d.messages)) {
      d.messages.unshift({
        sender_id: uid, receiver_id: toId,
        content: content,
        created_at: new Date().toISOString(),
        sender: { full_name: State.user.name },
      });
    }
    input.value = '';
    render();
  }).catch(function() {
    input.disabled = false;
    toast('Failed to send message.', 'error');
  });
}

/* ---- TUTOR ACCEPTING STUDENTS TOGGLE ---- */
function toggleAcceptingStudents() {
  var uid = State.user && State.user.id;
  if (!uid) return;
  var d       = State.liveData['tutor-dashboard'] || {};
  var tutor   = d.tutor || {};
  var current = tutor.accepting_new_students !== false;
  DB.toggleAcceptingStudents(uid, !current).then(function(r) {
    if (r && r.error) { toast('Could not update setting.', 'error'); return; }
    toast(!current ? 'Now accepting new students.' : 'Paused new student matches.', 'success');
    bustCache('tutor');
    loadPageData('tutor-dashboard');
  }).catch(function(){ toast('Something went wrong.', 'error'); });
}

/* ---- STUDENT HOMEWORK SUBMIT ---- */
function toggleSubmitForm(hwId) {
  var form   = document.getElementById('hw-submit-' + hwId);
  var btnWrap = document.getElementById('hw-submit-btn-' + hwId);
  if (!form) return;
  var showing = form.style.display !== 'none';
  form.style.display    = showing ? 'none' : '';
  if (btnWrap) btnWrap.style.display = showing ? '' : 'none';
}

function doSubmitHomework(hwId) {
  var uid     = State.user && State.user.id;
  var noteEl  = document.getElementById('hw-note-' + hwId);
  var photoEl = document.getElementById('hw-photo-' + hwId);
  var note    = noteEl  ? noteEl.value.trim() : '';
  var photo   = photoEl && photoEl.files && photoEl.files[0] ? photoEl.files[0] : null;
  var btn     = document.getElementById('hw-submit-btn-inner-' + hwId);
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> Submitting...'; }
  DB.submitStudentHomework(hwId, uid, note || null, photo)
    .then(function(r) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Submit'; }
      if (r && r.error) { toast('Could not submit. Try again.', 'error'); return; }
      toast('Homework submitted!', 'success');
      loadPageData('student-homework');
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Submit'; }
      toast('Something went wrong. Please try again.', 'error');
    });
}

/* ============================================
   LANDING PAGE
   ============================================ */
function renderLanding() {
  var parts = [];
  parts.push('<div class="landing">');
  parts.push('<div class="gradient-bg"><div class="g-blob g-1"></div><div class="g-blob g-2"></div><div class="g-blob g-3"></div><div class="g-blob g-4"></div><div class="g-blob g-5"></div></div>');

  // NAV
  parts.push('<nav class="nav">');
  parts.push('<div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div><div class="nav-logo-sub">Tutoring Platform</div></div></div>');
  parts.push('<div class="nav-actions"><button class="btn btn-ghost" onclick="openModal(\'login\')">Sign in</button></div>');
  parts.push('</nav>');

  // HERO
  parts.push('<section class="hero">');
  parts.push('<div class="hero-left">');
  parts.push('<div class="hero-eyebrow"><div class="hero-eyebrow-dot"></div>Free — Nonprofit — K–12</div>');
  parts.push('<h1 class="hero-title">Where the <span id="hero-word" class="hero-word-anim" style="display:inline-block;min-width:3.5ch">right</span> tutor<br>meets the <span id="hero-word-2" class="hero-word-anim" style="display:inline-block;min-width:5.5ch">right</span> student</h1>');
  parts.push('<p class="hero-sub">A thoughtfully designed tutoring platform that matches students with tutors by personality and learning style, tracks real academic progress, and keeps everyone motivated.</p>');
  parts.push('<div class="hero-cta">');
  parts.push('<button class="btn btn-primary btn-lg" onclick="openModal(\'login\')">Join the program</button>');
  parts.push('<button class="btn btn-secondary btn-lg" onclick="openHowItWorks()">See how it works</button>');
  parts.push('</div>');
  parts.push('<div class="hero-stats">');
  parts.push('<div><div class="hero-stat-val">100%</div><div class="hero-stat-lbl">Free forever</div></div>');
  parts.push('<div><div class="hero-stat-val">K–12</div><div class="hero-stat-lbl">All grades</div></div>');
  parts.push('<div><div class="hero-stat-val">3+</div><div class="hero-stat-lbl">Subjects</div></div>');
  parts.push('</div></div>');

  // Hero card
  parts.push('<div class="hero-right"><div class="hero-card" style="padding:0;overflow:hidden;min-width:340px">');
  parts.push('<div style="padding:18px 20px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(220,214,206,0.6)">');
  parts.push('<div style="font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text-1)">This week</div>');
  parts.push('<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">June 2026</div></div>');
  parts.push('<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:14px 16px;background:var(--surface-2)">');
  [['M',true,50],['T',false,0],['W',true,80],['T',false,0],['F',true,60],['S',false,0],['S',false,0]].forEach(function(d){
    var bg = d[1]?'var(--accent)':'rgba(0,0,0,0.04)', fg = d[1]?'#FAF8F5':'var(--text-3)';
    parts.push('<div style="display:flex;flex-direction:column;align-items:center;gap:4px">');
    parts.push('<div style="font-size:9px;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em">'+d[0]+'</div>');
    parts.push('<div style="width:32px;height:32px;border-radius:50%;background:'+bg+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:'+fg+'">'+(d[1]?'<i class="ti ti-check" style="font-size:13px"></i>':'')+'</div>');
    parts.push(d[1]?'<div style="font-size:9px;color:var(--accent);font-weight:500">+'+d[2]+'</div>':'<div style="font-size:9px;color:transparent">0</div>');
    parts.push('</div>');
  });
  parts.push('</div>');
  parts.push('<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid rgba(220,214,206,0.5)">');
  parts.push('<div style="padding:14px 18px;border-right:1px solid rgba(220,214,206,0.5)"><div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Points earned</div><div style="font-family:var(--font-display);font-size:28px;font-weight:600;color:var(--accent)">190</div><div style="font-size:11px;color:var(--teal);margin-top:2px">+40 from streak</div></div>');
  parts.push('<div style="padding:14px 18px"><div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Streak</div><div style="font-family:var(--font-display);font-size:28px;font-weight:600;color:var(--amber)">7</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">weeks running</div></div>');
  parts.push('</div>');
  parts.push('<div style="padding:14px 18px;display:flex;align-items:flex-start;gap:10px">');
  parts.push('<div style="width:34px;height:34px;border-radius:50%;background:var(--teal-soft);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--teal);flex-shrink:0">A</div>');
  parts.push('<div style="flex:1;background:var(--surface-2);border-radius:0 var(--r-md) var(--r-md) var(--r-md);padding:10px 12px"><div style="font-size:11px;font-weight:600;color:var(--text-1);margin-bottom:3px">Ahmed H.</div><div style="font-size:12px;color:var(--text-2);line-height:1.5">Great work this week. Review quadratic functions before Thursday — you\'re closer than you think.</div></div>');
  parts.push('</div></div></div></section>');

  // HOW IT WORKS
  parts.push('<section class="how-section"><div class="how-grid">');
  [['01','Smart matching','Every student takes a short intake quiz. Our algorithm pairs them with the tutor whose teaching style, pace, and personality best complements theirs.'],
   ['02','Weekly sessions','Students book their weekly session in the app. Automatic meeting links, smart reminders, and one-tap rescheduling — no back-and-forth needed.'],
   ['03','Progress tracked','After every session the tutor completes a checklist. Parents see the skill map update in real time — no calls needed.'],
   ['04','Points earned','Students earn points for attending, arriving on time, and submitting homework. They redeem them for real academic rewards — teacher approved.']
  ].forEach(function(s){
    parts.push('<div class="how-item" style="opacity:0.7;transition:opacity 0.2s ease,transform 0.2s ease,box-shadow 0.2s ease" onmouseenter="this.style.opacity=\'1\';this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.10)\'" onmouseleave="this.style.opacity=\'0.7\';this.style.transform=\'translateY(0)\';this.style.boxShadow=\'\'">');
    parts.push('<div class="how-num">'+s[0]+'</div><div class="how-title">'+s[1]+'</div><div class="how-desc">'+s[2]+'</div></div>');
  });
  parts.push('</div></section>');

  // FEATURE STRIP
  parts.push('<div class="feature-strip">');
  [['v','ti-brain','Smart matching','Pairs students with tutors by learning style, pace, and personality'],
   ['g','ti-chart-line','Live progress','Real-time skill maps updated after every session automatically'],
   ['a','ti-award','Points economy','Earn points for attendance and homework, redeem for real rewards'],
   ['s','ti-users','Parent visibility','Weekly digests and live progress reports for parents']
  ].forEach(function(f){
    parts.push('<div class="feature-strip-item"><div class="fs-icon '+f[0]+'"><i class="ti '+f[1]+'"></i></div><div><div class="fs-title">'+f[2]+'</div><div class="fs-desc">'+f[3]+'</div></div></div>');
  });
  parts.push('</div>');

  // FOOTER
  parts.push('<footer class="site-footer">');
  parts.push('<div class="footer-copy">© 2026 Nukhba Tutoring Platform. All rights reserved.</div>');
  parts.push('<div class="footer-links">');
  parts.push('<span class="footer-link" onclick="navigate(\'terms\')">Terms of Use</span>');
  parts.push('<span class="footer-link" onclick="navigate(\'privacy\')">Privacy Policy</span>');
  parts.push('<a class="footer-link" href="mailto:support@nukhba.org">Support</a>');
  parts.push('<span class="footer-link" onclick="openModal(\'login\')">Sign in</span>');
  parts.push('</div></footer></div>');
  return parts.join('');
}

/* ---- HOW IT WORKS MODAL ---- */
function openHowItWorks() {
  document.getElementById('how-modal') && document.getElementById('how-modal').remove();
  var parts = [];
  parts.push('<div class="modal-overlay" id="how-modal" onclick="if(event.target===this)closeModalById(\'how-modal\')" style="z-index:200">');
  parts.push('<div class="modal" style="max-width:500px" onclick="event.stopPropagation()">');
  parts.push('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">');
  parts.push('<div style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--text-1)">How Nukhba works</div>');
  parts.push('<button onclick="closeModalById(\'how-modal\')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px"><i class="ti ti-x"></i></button>');
  parts.push('</div>');
  [['ti-brain','var(--accent)','var(--accent-soft)','01','Smart matching','Every student takes a 5-minute quiz. Our algorithm pairs them with a tutor by learning style, pace, subject, and personality.'],
   ['ti-calendar-check','var(--teal)','var(--teal-soft)','02','Weekly sessions','Students book sessions in the app, get automatic meeting links, and receive smart reminders.'],
   ['ti-chart-line','var(--amber)','var(--amber-soft)','03','Progress tracked','After every session the tutor completes a checklist. Parents see the skill map update in real time.'],
   ['ti-award','var(--steel)','var(--steel-soft)','04','Points for effort','Students earn points for attendance and homework. Spend them on real rewards — all teacher-approved.']
  ].forEach(function(s, i){
    var border = i < 3 ? 'border-bottom:1px solid var(--border-2);' : '';
    parts.push('<div style="display:flex;gap:14px;padding:14px 0;'+border+'">');
    parts.push('<div style="width:38px;height:38px;border-radius:10px;background:'+s[2]+';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti '+s[0]+'" style="font-size:17px;color:'+s[1]+'"></i></div>');
    parts.push('<div><div style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Step '+s[3]+'</div>');
    parts.push('<div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">'+s[4]+'</div>');
    parts.push('<div style="font-size:12px;color:var(--text-2);line-height:1.6">'+s[5]+'</div></div></div>');
  });
  parts.push('<button onclick="closeModalById(\'how-modal\');openModal(\'login\')" style="width:100%;margin-top:18px;padding:12px;background:var(--accent);color:#FAF8F5;border:none;border-radius:var(--r-md);font-size:14px;font-weight:500;cursor:pointer;">Join the program</button>');
  parts.push('</div></div>');
  document.body.insertAdjacentHTML('beforeend', parts.join(''));
}

/* ---- LOGIN MODAL ---- */
function renderLoginModal() {
  var parts = [];
  parts.push('<div class="modal-overlay" id="login-modal" onclick="if(event.target===this&&!document.getElementById(\'signup-confirmed\'))closeModalById(\'login-modal\')">');
  parts.push('<div class="modal" onclick="event.stopPropagation()">');
  parts.push('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">');
  parts.push('<div style="display:flex;align-items:center;gap:10px"><div class="nav-logo-mark">N</div><div style="font-family:var(--font-display);font-size:18px;font-weight:600;color:var(--text-1)">Nukhba</div></div>');
  parts.push('<button id="close-login-btn" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px"><i class="ti ti-x"></i></button>');
  parts.push('</div>');
  // Tabs
  parts.push('<div style="display:flex;gap:0;border:1px solid var(--border);border-radius:var(--r-md);padding:3px;margin-bottom:22px;background:var(--surface-2)">');
  parts.push('<button id="tab-signin" onclick="authSwitchTab(\'signin\')" style="flex:1;padding:8px;border-radius:8px;font-size:13px;font-weight:500;background:var(--surface);color:var(--text-1);border:none;cursor:pointer;transition:all .15s">Sign in</button>');
  parts.push('<button id="tab-signup" onclick="authSwitchTab(\'signup\')" style="flex:1;padding:8px;border-radius:8px;font-size:13px;font-weight:500;background:transparent;color:var(--text-3);border:none;cursor:pointer;transition:all .15s">Create account</button>');
  parts.push('</div>');
  // Error
  parts.push('<div id="auth-error" style="display:none;background:var(--danger-soft);color:var(--danger);border-radius:var(--r-md);padding:10px 14px;font-size:13px;margin-bottom:14px;"></div>');
  // Sign in
  parts.push('<div id="form-signin">');
  parts.push('<div class="form-group"><label class="form-label">Email</label><input id="signin-email" class="form-input" type="email" placeholder="you@example.com" maxlength="254" autocomplete="email" /></div>');
  parts.push('<div class="form-group"><label class="form-label">Password</label><input id="signin-password" class="form-input" type="password" placeholder="••••••••" maxlength="128" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')authDoSignIn()" /></div>');
  parts.push('<button class="btn btn-primary" id="signin-btn" style="width:100%;justify-content:center;margin-bottom:8px" onclick="authDoSignIn()"><i class="ti ti-login"></i> Sign in</button>');
  parts.push('<div style="font-size:12px;color:var(--text-3);text-align:center">Max 5 sign-in attempts per 15 minutes</div>');
  parts.push('</div>');
  // Sign up
  parts.push('<div id="form-signup" style="display:none">');
  parts.push('<div class="form-group"><label class="form-label">Full name</label><input id="signup-name" class="form-input" type="text" placeholder="Your full name" maxlength="80" autocomplete="name" /></div>');
  parts.push('<div class="form-group"><label class="form-label">Email</label><input id="signup-email" class="form-input" type="email" placeholder="you@example.com" maxlength="254" autocomplete="email" /></div>');
  parts.push('<div class="form-group"><label class="form-label">Password <span style="color:var(--text-3);font-weight:400">(min 8 characters)</span></label><input id="signup-password" class="form-input" type="password" placeholder="Create a password" maxlength="128" autocomplete="new-password" /></div>');
  parts.push('<div class="form-group"><label class="form-label">Confirm password</label><input id="signup-password-confirm" class="form-input" type="password" placeholder="Repeat your password" maxlength="128" autocomplete="new-password" /></div>');
  parts.push('<div class="form-group"><label class="form-label">I am a</label><select id="signup-role" class="form-input"><option value="">Select your role</option><option value="student">Student</option><option value="tutor">Tutor</option><option value="parent">Parent / Guardian</option></select></div>');
  parts.push('<button class="btn btn-primary" id="signup-btn" style="width:100%;justify-content:center;margin-bottom:8px" onclick="authDoSignUp()"><i class="ti ti-user-plus"></i> Request access</button>');
  parts.push('<div style="font-size:12px;color:var(--text-3);text-align:center">An admin will approve your account before you can sign in</div>');
  parts.push('</div>');
  // Footer
  parts.push('<div style="text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid var(--border-2);font-size:12px;color:var(--text-3)">');
  parts.push('<a href="mailto:support@nukhba.org" style="color:var(--accent)">Support</a> &nbsp;·&nbsp; ');
  parts.push('<span style="cursor:pointer;color:var(--accent)" onclick="closeModalById(\'login-modal\');navigate(\'privacy\')">Privacy Policy</span> &nbsp;·&nbsp; ');
  parts.push('<span style="cursor:pointer;color:var(--accent)" onclick="closeModalById(\'login-modal\');navigate(\'terms\')">Terms of Use</span>');
  parts.push('</div></div></div>');
  return parts.join('');
}

function authSwitchTab(tab) {
  var si = tab === 'signin';
  document.getElementById('form-signin').style.display = si ? 'block' : 'none';
  document.getElementById('form-signup').style.display = si ? 'none' : 'block';
  document.getElementById('tab-signin').style.background = si ? 'var(--surface)' : 'transparent';
  document.getElementById('tab-signin').style.color = si ? 'var(--text-1)' : 'var(--text-3)';
  document.getElementById('tab-signup').style.background = si ? 'transparent' : 'var(--surface)';
  document.getElementById('tab-signup').style.color = si ? 'var(--text-3)' : 'var(--text-1)';
  var err = document.getElementById('auth-error');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
}

function authShowError(msg) {
  var err = document.getElementById('auth-error');
  if (!err) { toast(msg,'error'); return; }
  err.textContent = msg;
  err.style.display = 'block';
}

function authSetLoading(btnId, loading) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
  btn.innerHTML = loading
    ? '<div class="btn-spinner"></div> Please wait...'
    : (btnId === 'signin-btn' ? '<i class="ti ti-login"></i> Sign in' : '<i class="ti ti-user-plus"></i> Request access');
}

function authDoSignIn() {
  var email    = (document.getElementById('signin-email')    ||{}).value||'';
  var password = (document.getElementById('signin-password') ||{}).value||'';
  var err = document.getElementById('auth-error');
  if (err) err.style.display = 'none';
  authSetLoading('signin-btn', true);
  NukhbaAuth.signIn(email, password, function(msg) {
    authSetLoading('signin-btn', false);
    authShowError(msg);
  });
  setTimeout(function(){ authSetLoading('signin-btn', false); }, 6000);
}

function authDoSignUp() {
  var name     = (document.getElementById('signup-name')             ||{}).value||'';
  var email    = (document.getElementById('signup-email')            ||{}).value||'';
  var password = (document.getElementById('signup-password')         ||{}).value||'';
  var confirm  = (document.getElementById('signup-password-confirm') ||{}).value||'';
  var role     = (document.getElementById('signup-role')             ||{}).value||'';
  var err = document.getElementById('auth-error');
  if (err) err.style.display = 'none';
  if (password !== confirm) { authShowError('Passwords do not match.'); return; }
  authSetLoading('signup-btn', true);
  NukhbaAuth.signUp(email, password, name, role, function(msg) {
    authSetLoading('signup-btn', false);
    authShowError(msg);
  });
  setTimeout(function(){ authSetLoading('signup-btn', false); }, 6000);
}

/* ---- APP SHELL ---- */
function renderShell(navItems, pageContent, title) {
  var u        = State.user;
  var colorMap = { student:'purple', tutor:'green', parent:'amber', admin:'purple' };
  var unread   = (State.notifications || []).filter(function(n){ return !n.is_read; }).length;
  var badge    = unread
    ? '<span class="notif-unread-badge" style="position:absolute;top:-3px;right:-3px;background:var(--danger);color:#fff;border-radius:999px;font-size:9px;font-weight:700;min-width:15px;height:15px;display:flex;align-items:center;justify-content:center;padding:0 2px;pointer-events:none">' + (unread > 9 ? '9+' : unread) + '</span>'
    : '';
  return '<div class="app-shell">' +
    '<aside class="sidebar" id="sidebar">' +
    '<div class="sidebar-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div><div style="font-size:10px;color:var(--text-3);text-transform:capitalize">' + esc(u.role) + ' portal</div></div></div>' +
    '<nav class="sidebar-nav">' + navItems + '</nav>' +
    '<div class="sidebar-user">' +
    Avatar(u.name, colorMap[u.role]||'purple', 34) +
    '<div><div class="user-name">' + esc(u.name) + '</div><div class="user-role" style="text-transform:capitalize">' + esc(u.role) + '</div></div>' +
    '<button class="btn btn-icon btn-ghost" onclick="NukhbaAuth.signOut()" title="Sign out"><i class="ti ti-logout" style="font-size:16px"></i></button>' +
    '</div></aside>' +
    '<div class="main-content">' +
    '<div class="topbar"><div class="flex items-center gap-12">' +
    '<button class="btn btn-icon btn-ghost" id="menu-btn" onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')" style="display:none"><i class="ti ti-menu-2"></i></button>' +
    '<div class="topbar-title">' + esc(title) + '</div></div>' +
    '<div class="topbar-right">' +
    '<div style="position:relative;display:inline-flex">' +
    '<button class="btn btn-icon btn-secondary" onclick="toggleNotificationsDropdown()" title="Notifications" style="position:relative"><i class="ti ti-bell"></i>' + badge + '</button>' +
    '</div>' +
    '</div></div>' +
    '<div class="page">' + pageContent + '</div>' +
    '</div></div>';
}

/* ============================================
   ONBOARDING
   ============================================ */
var ONBOARDING_STEPS = {
  student: [
    { id:'subjects',        title:'Which subjects do you need help with?',    sub:'Select all that apply — we use this to match you with a tutor who specialises in these areas.',                     type:'multi',        choices:[{label:'SAT / ACT Prep',value:'SAT/ACT'},{label:'Math',value:'Math'},{label:'Sciences',value:'Sciences'},{label:'English & Literature',value:'English'},{label:'Arabic Language',value:'Arabic'},{label:'French / Other Language',value:'Languages'}] },
    { id:'learning_method', title:'How do you learn best?',                   sub:'Your tutor will lean into this style during sessions.',                                                              type:'choice',       choices:[{label:'Visual — diagrams and worked examples',value:'visual'},{label:'Discussion — talking through problems together',value:'discussion'},{label:'Practice — lots of exercises and drills',value:'practice'}] },
    { id:'pace_preference', title:'What learning pace works for you?',         sub:'There is no wrong answer — this helps your tutor plan sessions.',                                                    type:'choice',       choices:[{label:'Slow — I like more time per concept',value:'slow'},{label:'Moderate — balanced with regular check-ins',value:'moderate'},{label:'Fast — I pick things up quickly',value:'fast'}] },
    { id:'preferred_style', title:'What kind of tutor helps you most?',       sub:'We match you with tutors whose personality fits how you work.',                                                       type:'choice',       choices:[{label:'Patient — re-explains until I get it, never rushes',value:'patient'},{label:'Structured — clear plan with milestones I can track',value:'structured'},{label:'Energetic — keeps me challenged and engaged',value:'energetic'}] },
    { id:'grade',           title:'What grade are you in?',                   sub:'This helps us match you with a tutor familiar with your curriculum.',                                                 type:'choice',       choices:[{label:'Grade 1–3',value:'1'},{label:'Grade 4–6',value:'4'},{label:'Grade 7–8',value:'7'},{label:'Grade 9–10',value:'9'},{label:'Grade 11–12',value:'11'}] },
    { id:'goal_description',title:'What is your main goal?',                  sub:'Describe what you want to achieve — the more specific, the better the match.',                                        type:'text',         placeholder:'e.g. Raise my SAT Math score from 580 to 680 before November' },
  ],
  tutor: [
    { id:'subjects',        title:'Which subjects can you teach?',            sub:'Select all that apply.',                                                                                              type:'multi',        choices:[{label:'SAT / ACT Prep',value:'SAT/ACT'},{label:'Math',value:'Math'},{label:'Sciences',value:'Sciences'},{label:'English & Literature',value:'English'},{label:'Arabic Language',value:'Arabic'},{label:'French / Other Language',value:'Languages'}] },
    { id:'teaching_method', title:'How do you prefer to teach?',              sub:'Students who match your style will be ranked higher for you.',                                                         type:'choice',       choices:[{label:'Visual — diagrams and worked examples',value:'visual'},{label:'Discussion — talking through problems together',value:'discussion'},{label:'Practice — lots of exercises and drills',value:'practice'}] },
    { id:'pace',            title:'At what pace do you typically teach?',     sub:'Students will be matched with you based on their own pace preference.',                                               type:'choice',       choices:[{label:'Slow — thorough and deliberate',value:'slow'},{label:'Moderate — balanced and adaptive',value:'moderate'},{label:'Fast — efficient and challenge-driven',value:'fast'}] },
    { id:'tutor_style',     title:'How would students describe you?',         sub:'This helps us match you with students whose needs fit your approach.',                                                type:'choice',       choices:[{label:'Patient — I re-explain until they get it, I never rush',value:'patient'},{label:'Structured — I follow a clear plan with milestones',value:'structured'},{label:'Energetic — I challenge students and keep sessions lively',value:'energetic'}] },
    { id:'bio',             title:'Tell students about yourself',             sub:'A short bio helps students and parents feel confident before the first session.',                                      type:'text',         placeholder:'e.g. I am a mathematics graduate with 3 years of tutoring experience...' },
    { id:'teacher_reference',title:'Do you have a teacher reference?',        sub:'Optional — a short recommendation from a teacher or mentor. Shown on your profile to students.',                      type:'text_optional',placeholder:'e.g. "Highly recommended by Dr. Smith for exceptional ability in mathematics." — leave blank to skip' },
  ],
};

function onboardingTotalSteps() {
  var steps = ONBOARDING_STEPS[State.user && State.user.role];
  return steps ? steps.length : 0;
}

function onboardingCurrentStep() {
  var steps = ONBOARDING_STEPS[State.user && State.user.role];
  return steps ? steps[State.onboarding.step - 1] || null : null;
}

function onboardingSetChoice(value) {
  var step = onboardingCurrentStep();
  if (!step) return;
  State.onboarding.data[step.id] = value;
  if (step.type === 'choice') setTimeout(function(){ onboardingNext(); }, 180);
  else render();
}

function onboardingToggleMulti(value) {
  var step = onboardingCurrentStep();
  if (!step) return;
  var cur = State.onboarding.data[step.id] || [];
  var idx = cur.indexOf(value);
  State.onboarding.data[step.id] = idx === -1 ? cur.concat([value]) : cur.filter(function(v){ return v !== value; });
  render();
}

function onboardingNext() {
  var step  = onboardingCurrentStep();
  var total = onboardingTotalSteps();
  if (step && step.type === 'text' && !(State.onboarding.data[step.id]||'').trim()) {
    toast('Please fill in this field before continuing.','error'); return;
  }
  if (step && step.type === 'multi' && !(State.onboarding.data[step.id]||[]).length) {
    toast('Please select at least one option.','error'); return;
  }
  if (State.onboarding.step < total) {
    State.onboarding.step++;
    render();
    window.scrollTo(0,0);
  } else {
    onboardingSubmit();
  }
}

function onboardingBack() {
  if (State.onboarding.step > 1) { State.onboarding.step--; render(); window.scrollTo(0,0); }
}

function onboardingSubmit() {
  var role = State.user.role;
  var data = State.onboarding.data;
  var uid  = State.user.id;
  if (_supabaseClient && uid) {
    if (role === 'student') {
      var studentRow = {
        id: uid,
        pace_preference: data.pace_preference || null,
        grade: parseInt(data.grade, 10) || null,
        goal_description: data.goal_description ? Sanitize.text(data.goal_description, 'long') : null,
        subjects: data.subjects || [],
        learning_method: data.learning_method || null,
        preferred_style: data.preferred_style || null,
      };
      _supabaseClient.from('students').upsert([studentRow], { onConflict: 'id' }).then(function(r){
        if (r.error) {
          console.warn('[Onboarding] Full upsert failed, trying minimal insert:', r.error);
          // Fallback: insert only columns that existed before the new migrations
          _supabaseClient.from('students').upsert([{
            id: uid,
            pace_preference: data.pace_preference || null,
            grade: parseInt(data.grade, 10) || null,
            goal_description: data.goal_description ? Sanitize.text(data.goal_description, 'long') : null,
          }], { onConflict: 'id' }).then(function(r2){
            if (r2.error) console.warn('[Onboarding] Fallback insert also failed:', r2.error);
          });
        }
      });
    } else if (role === 'tutor') {
      _supabaseClient.from('tutors').upsert([{
        id: uid,
        subjects: data.subjects || [],
        teaching_method: data.teaching_method || null,
        pace: data.pace || null,
        tutor_style: data.tutor_style || null,
        bio: Sanitize.text(data.bio || '', 'long'),
        teacher_reference: data.teacher_reference ? Sanitize.text(data.teacher_reference, 'long') : null,
      }], { onConflict: 'id' }).then(function(r){
        if (r.error) { console.warn('[Onboarding]', r.error); return; }
        _supabaseClient.from('students').select('id').then(function(sr){
          (sr.data || []).forEach(function(s){ runMatchEngine(s.id); });
        });
      });
    }
  }
  State.user.onboarded = true;
  if (role === 'student') State.gated = true;
  State.page = role === 'student' ? 'student-matches' : role + '-dashboard';
  toast('Profile saved. Welcome to Nukhba.', 'success');
  render();
  loadPageData(State.page);
}

function runMatchEngine(studentId) {
  if (!_supabaseClient || !studentId) return Promise.resolve(null);
  var student;
  return _supabaseClient.from('students')
    .select('subjects, learning_method, pace_preference, preferred_style')
    .eq('id', studentId)
    .single()
    .then(function(sr) {
      if (sr.error || !sr.data) return null;
      student = sr.data;
      return _supabaseClient.from('tutors').select('id, subjects, teaching_method, pace, tutor_style')
        .or('accepting_new_students.is.null,accepting_new_students.eq.true');
    })
    .then(function(tr) {
      if (!tr || !student) return null;
      if (tr.error || !tr.data || !tr.data.length) return null;
      var studentSubjects = Array.isArray(student.subjects) ? student.subjects : [];
      var scores = tr.data.map(function(t) {
        var tutorSubjects  = Array.isArray(t.subjects) ? t.subjects : [];
        var subjectHit     = studentSubjects.length > 0 && tutorSubjects.some(function(s){ return studentSubjects.indexOf(s) !== -1; });
        var subjectScore   = subjectHit ? 100 : 0;
        var paceScore      = student.pace_preference && student.pace_preference === t.pace ? 100 : 0;
        var methodScore    = student.learning_method  && student.learning_method  === t.teaching_method ? 100 : 0;
        var styleScore     = student.preferred_style  && student.preferred_style  === t.tutor_style     ? 100 : 0;
        var overall        = Math.round(subjectScore * 0.4 + paceScore * 0.25 + methodScore * 0.2 + styleScore * 0.15);
        return {
          student_id:    studentId,
          tutor_id:      t.id,
          style_score:   methodScore,
          pace_score:    paceScore,
          subject_score: subjectScore,
          overall_score: overall,
        };
      });
      return _supabaseClient.from('match_scores').upsert(scores, { onConflict: 'student_id,tutor_id' });
    })
    .then(function(mr) {
      if (mr && mr.error) console.warn('[Match] Upsert error:', mr.error);
      return null;
    })
    .catch(function(e){ console.warn('[Match] Engine error:', e); });
}

function renderOnboarding() {
  var role  = State.user && State.user.role;
  var step  = onboardingCurrentStep();
  var total = onboardingTotalSteps();
  var cur   = State.onboarding.step;
  var data  = State.onboarding.data;
  if (!step) { State.page = role+'-dashboard'; render(); return ''; }
  var pct = Math.round(((cur-1)/total)*100);
  var parts = [];
  parts.push('<div class="onboarding-wrap">');
  parts.push('<div class="gradient-bg"><div class="g-blob g-1"></div><div class="g-blob g-2"></div><div class="g-blob g-3"></div><div class="g-blob g-4"></div><div class="g-blob g-5"></div></div>');
  parts.push('<div class="onboarding-card">');
  parts.push('<div class="onboarding-header"><div class="nav-logo-mark" style="width:32px;height:32px;font-size:15px;border-radius:8px">N</div><div style="font-size:13px;color:var(--text-3)">Step '+cur+' of '+total+'</div></div>');
  parts.push('<div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:32px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--accent);border-radius:2px;transition:width 0.3s ease"></div></div>');
  parts.push('<div style="margin-bottom:28px"><h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;color:var(--text-1);margin-bottom:8px;line-height:1.3">'+esc(step.title)+'</h2><p style="font-size:14px;color:var(--text-3);line-height:1.6;margin:0">'+esc(step.sub)+'</p></div>');
  if (step.type === 'choice' || step.type === 'multi') {
    var selected = step.type === 'multi' ? (data[step.id]||[]) : null;
    parts.push('<div class="onboarding-choices">');
    step.choices.forEach(function(c){
      var isSel = step.type === 'multi' ? selected.indexOf(c.value)!==-1 : data[step.id]===c.value;
      var fn = step.type === 'multi' ? 'onboardingToggleMulti' : 'onboardingSetChoice';
      parts.push('<div class="onboarding-choice'+(isSel?' selected':'')+'" onclick="'+fn+'(\''+c.value+'\')">');
      parts.push('<div class="onboarding-choice-check"><i class="ti ti-check" style="font-size:11px"></i></div>');
      parts.push('<span>'+esc(c.label)+'</span></div>');
    });
    parts.push('</div>');
    if (step.type === 'multi') parts.push('<div style="font-size:12px;color:var(--text-3);margin-top:8px">Select all that apply</div>');
  } else if (step.type === 'text' || step.type === 'text_optional') {
    if (step.type === 'text_optional') parts.push('<div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Optional</div>');
    parts.push('<textarea id="onboarding-text" class="form-input" rows="4" placeholder="'+esc(step.placeholder)+'" maxlength="500" style="resize:none;line-height:1.6;font-size:14px" oninput="State.onboarding.data[\''+step.id+'\']=this.value">'+esc(data[step.id]||'')+'</textarea>');
  }
  parts.push('<div style="display:flex;gap:10px;margin-top:28px">');
  if (cur > 1) parts.push('<button class="btn btn-secondary" onclick="onboardingBack()" style="min-width:90px"><i class="ti ti-arrow-left"></i> Back</button>');
  if (step.type !== 'choice') {
    var isLast = cur === total;
    parts.push('<button class="btn btn-primary" onclick="onboardingNext()" style="flex:1;justify-content:center">'+(isLast?'Complete setup <i class="ti ti-check"></i>':'Continue <i class="ti ti-arrow-right"></i>')+'</button>');
  }
  parts.push('</div>');
  if (role !== 'student') {
    parts.push('<div style="text-align:center;margin-top:16px"><span style="font-size:12px;color:var(--text-3);cursor:pointer" onclick="onboardingSubmit()">Skip for now</span></div>');
  }
  parts.push('</div></div>');
  return parts.join('');
}

/* ============================================
   STUDENT PORTAL
   ============================================ */
function studentNav() {
  var items = [
    {id:'student-dashboard', icon:'ti-layout-dashboard', label:'Dashboard'},
    {id:'student-sessions',  icon:'ti-calendar-check',   label:'My sessions'},
    {id:'student-calendar',  icon:'ti-calendar',          label:'Calendar'},
    {id:'student-homework',  icon:'ti-books',             label:'Homework'},
    {id:'student-matches',   icon:'ti-star',              label:'Find tutors'},
    {id:'student-progress',  icon:'ti-chart-line',        label:'Progress'},
    {id:'student-points',    icon:'ti-coins',             label:'Points & rewards'},
    {id:'student-messages',  icon:'ti-message-2',         label:'Messages'},
  ];
  var html = items.map(function(i){
    var locked = State.gated && i.id !== 'student-matches';
    if (locked) {
      return '<div class="nav-item" style="opacity:0.4;cursor:not-allowed"><i class="ti '+i.icon+'"></i> '+i.label+' <i class="ti ti-lock" style="margin-left:auto;font-size:13px"></i></div>';
    }
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+'</div>';
  }).join('');
  if (State.gated) {
    html += '<div style="margin:10px 8px 0;padding:10px 12px;background:var(--amber-soft);border-radius:var(--r-md);font-size:11px;color:var(--amber);line-height:1.5"><i class="ti ti-lock" style="font-size:12px"></i> Apply to a tutor to unlock your portal</div>';
  }
  return html;
}

function renderStudentDashboard() {
  if (isLoading('student-dashboard')) return renderShell(studentNav(), Spinner(), 'Dashboard');
  var d = State.liveData['student-dashboard'] || {};
  var s = d.student || {};
  var sessions  = d.sessions  || [];
  var skills    = d.skills    || [];
  var name      = (s.users && s.users.full_name) || State.user.name || 'there';
  var firstName = name.split(' ')[0];
  var next      = sessions.find(function(s){ return s.status === 'upcoming'; });
  var balance   = s.points_balance || 0;
  var streak    = s.attendance_streak || 0;

  var content = '<div class="page-header"><div><div class="page-title">Good afternoon, '+esc(firstName)+'</div>';
  content += next ? '<div class="page-sub">Next session: '+formatDate(next.scheduled_at)+' at '+formatTime(next.scheduled_at)+'</div>'
                  : '<div class="page-sub">No upcoming sessions scheduled yet.</div>';
  content += '</div><button class="btn btn-primary" onclick="navigate(\'student-sessions\')"><i class="ti ti-calendar-plus"></i> Sessions</button></div>';

  // Points card
  content += '<div class="xp-card"><div class="flex items-center justify-between mb-12"><div><div class="xp-big">'+balance+'</div><div class="xp-lbl">Points balance</div></div></div></div>';

  // Stats
  content += '<div class="grid-2 mb-24"><div class="card"><div class="card-title">Attendance streak</div>';
  content += '<div class="flex items-center gap-12 mb-8"><div style="font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--amber)">'+streak+'</div><div><div style="font-size:14px;font-weight:600;color:var(--text-1)">Week streak</div></div></div></div>';

  content += '<div class="card"><div class="card-title">This semester</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
  content += '<div style="padding:12px;background:var(--surface-2);border-radius:var(--r-md);text-align:center"><div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-1)">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="text-xs text-3">Sessions done</div></div>';
  content += '<div style="padding:12px;background:var(--surface-2);border-radius:var(--r-md);text-align:center"><div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--teal)">'+skills.filter(function(sk){return sk.status==='mastered';}).length+'</div><div class="text-xs text-3">Skills mastered</div></div>';
  content += '</div></div></div>';

  // Next session
  if (next) {
    content += '<div class="card mb-24"><div class="card-title">Next session</div>';
    content += '<div class="session-card" style="background:var(--accent-soft);border-color:rgba(107,76,59,0.3)">';
    content += '<div class="session-time"><div class="session-time-val">'+formatTime(next.scheduled_at)+'</div><div class="session-time-day">'+formatDate(next.scheduled_at)+'</div></div>';
    content += '<div class="session-body"><div class="session-student">'+esc(s.subject||'Session')+'</div>';
    content += '<div class="session-meta"><i class="ti ti-clock"></i> '+(next.duration_minutes||60)+' min <i class="ti ti-video"></i> Online</div></div>';
    content += '<div class="flex gap-8">';
    if (next.meeting_link) content += '<button class="btn btn-primary btn-sm" onclick="markAndJoin(\''+next.id+'\',this)" data-url="'+esc(next.meeting_link)+'"><i class="ti ti-video"></i> Join</button>';
    content += '</div></div></div>';
  }

  // Skill map
  if (skills.length) {
    content += '<div class="card"><div class="flex items-center justify-between mb-16"><div class="card-title" style="margin-bottom:0">Skill map</div><button class="btn btn-ghost btn-sm" onclick="navigate(\'student-progress\')">View all</button></div>';
    content += skills.slice(0,5).map(function(sk){
      return '<div class="skill-row"><div class="skill-name">'+esc(sk.skill_name)+'</div><div class="skill-bar-wrap">'+ProgressBar(sk.progress_pct,sk.status==='mastered'?'mastered':sk.status==='progress'?'progress':'danger')+'</div><div class="skill-pct">'+sk.progress_pct+'%</div>'+StatusBadge(sk.status)+'</div>';
    }).join('');
    content += '</div>';
  } else {
    content += '<div class="card">'+EmptyState('ti-chart-line','Your skill map will appear here after your first session.')+'</div>';
  }

  return renderShell(studentNav(), content, 'Dashboard');
}

function renderStudentSessions() {
  if (isLoading('student-sessions')) return renderShell(studentNav(), Spinner(), 'My Sessions');
  var d        = State.liveData['student-sessions'] || {};
  var sessions = d.sessions || [];
  var upcoming = sessions.filter(function(s){ return s.status === 'upcoming'; });
  var past     = sessions.filter(function(s){ return s.status === 'completed' || s.status === 'cancelled'; });

  var content = '<div class="page-header"><div><div class="page-title">My sessions</div><div class="page-sub">Your upcoming and past sessions</div></div></div>';

  content += '<div class="card mb-24"><div class="card-title">Upcoming</div>';
  if (upcoming.length) {
    content += upcoming.map(function(s){
      return '<div class="session-card"><div class="session-time"><div class="session-time-val">'+formatTime(s.scheduled_at)+'</div><div class="session-time-day">'+formatDate(s.scheduled_at)+'</div></div><div class="session-body"><div class="session-student">Session</div><div class="session-meta"><i class="ti ti-clock"></i>'+(s.duration_minutes||60)+' min <i class="ti ti-video"></i> Online</div></div>'+(s.meeting_link?'<button class="btn btn-primary btn-sm" onclick="markAndJoin(\''+s.id+'\',this)" data-url="'+esc(s.meeting_link)+'"><i class="ti ti-video"></i> Join</button>':'')+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-calendar','No upcoming sessions scheduled.');
  }
  content += '</div>';

  content += '<div class="card"><div class="card-title">Past sessions</div>';
  if (past.length) {
    content += '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Duration</th><th>Status</th></tr></thead><tbody>';
    content += past.map(function(s){
      return '<tr><td>'+formatDate(s.scheduled_at)+'</td><td>'+(s.duration_minutes||60)+' min</td><td>'+StatusBadge(s.status)+'</td></tr>';
    }).join('');
    content += '</tbody></table></div>';
  } else {
    content += EmptyState('ti-history','No past sessions yet.');
  }
  content += '</div>';
  return renderShell(studentNav(), content, 'My Sessions');
}

function renderStudentProgress() {
  if (isLoading('student-progress')) return renderShell(studentNav(), Spinner(), 'Progress');
  var d      = State.liveData['student-progress'] || {};
  var s      = d.student || {};
  var skills = d.skills  || [];

  var content = '<div class="page-header"><div><div class="page-title">My progress</div><div class="page-sub">'+(s.subject?esc(s.subject)+' · ':'')+(s.goal_description?esc(s.goal_description):'')+'</div></div></div>';

  var mastered   = skills.filter(function(sk){ return sk.status==='mastered'; }).length;
  var inProgress = skills.filter(function(sk){ return sk.status==='progress'; }).length;
  var sessions   = d.sessions || [];

  content += '<div class="stat-grid mb-24">';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-calendar-check"></i></div><div class="stat-val">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="stat-lbl">Sessions done</div></div>';
  content += '<div class="stat-card"><div class="stat-icon v"><i class="ti ti-star"></i></div><div class="stat-val">'+mastered+'</div><div class="stat-lbl">Skills mastered</div></div>';
  content += '<div class="stat-card"><div class="stat-icon a"><i class="ti ti-chart-line"></i></div><div class="stat-val">'+inProgress+'</div><div class="stat-lbl">In progress</div></div>';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-target-arrow"></i></div><div class="stat-val">'+(s.attendance_streak||0)+'</div><div class="stat-lbl">Week streak</div></div>';
  content += '</div>';

  content += '<div class="card">';
  if (skills.length) {
    content += '<div class="card-title">Skill map</div>';
    content += skills.map(function(sk){
      return '<div class="skill-row"><div style="flex:1"><div class="skill-name">'+esc(sk.skill_name)+'</div><div style="margin-top:6px">'+ProgressBar(sk.progress_pct,sk.status==='mastered'?'mastered':sk.status==='progress'?'progress':'danger')+'</div></div><div style="min-width:48px;text-align:right"><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+sk.progress_pct+'%</div><div style="margin-top:4px">'+StatusBadge(sk.status)+'</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-chart-line','Your skill map will appear here after your first session.');
  }
  content += '</div>';
  return renderShell(studentNav(), content, 'Progress');
}

function renderStudentPoints() {
  if (isLoading('student-points')) return renderShell(studentNav(), Spinner(), 'Points & Rewards');
  var d    = State.liveData['student-points'] || {};
  var s    = d.student || {};
  var txns = d.transactions || [];
  var balance = s.points_balance || 0;

  var content = '<div class="page-header"><div><div class="page-title">Points & rewards</div><div class="page-sub">Earn points for attendance and homework</div></div></div>';

  // XP card — balance only, no overlapping right-side content
  content += '<div class="xp-card mb-24"><div style="position:relative;z-index:1">';
  content += '<div style="font-size:12px;color:var(--text-3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Points balance</div>';
  content += '<div class="xp-big">'+balance+'</div>';
  content += '</div></div>';

  // How to earn — separate clean card
  content += '<div class="card mb-24"><div class="card-title">How to earn points</div>';
  content += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  [
    ['ti-calendar-check','Attend session',   '+50', 'teal'],
    ['ti-clock',         'Arrive on time',   '+10', 'teal'],
    ['ti-book',          'Homework on time', '+30', 'teal'],
    ['ti-flame',         'Weekly streak',    '+10/wk', 'amber'],
  ].forEach(function(row){
    content += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface-2);border-radius:8px">';
    content += '<div style="width:30px;height:30px;border-radius:8px;background:var(--'+row[3]+'-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti '+row[0]+'" style="color:var(--'+row[3]+');font-size:14px"></i></div>';
    content += '<div style="flex:1;font-size:13px;color:var(--text-1)">'+row[1]+'</div>';
    content += '<div style="font-size:13px;font-weight:600;color:var(--'+row[3]+')">'+row[2]+'</div>';
    content += '</div>';
  });
  content += '</div></div>';

  // Rewards store — empty state until admin configures rewards
  content += '<div class="card mb-24"><div class="card-title">Rewards store</div>';
  content += EmptyState('ti-gift', 'Rewards haven\'t been set up yet — check back soon.');
  content += '</div>';

  // Transaction history
  content += '<div class="card"><div class="card-title">Recent transactions</div>';
  if (txns.length) {
    content += txns.map(function(t){
      var plus = t.type === 'earn';
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-2)">'+
        '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:'+(plus?'var(--teal-soft)':'var(--danger-soft)')+'">'+
        '<i class="ti ti-'+(plus?'plus':'minus')+'" style="font-size:13px;color:'+(plus?'var(--teal)':'var(--danger)')+'"></i></div>'+
        '<div style="flex:1;font-size:13px;color:var(--text-1)">'+esc(t.reason||'Transaction')+'</div>'+
        '<div style="font-size:13px;font-weight:600;color:'+(plus?'var(--teal)':'var(--danger)')+'">'+
        (plus?'+':'-')+t.amount+'</div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-coins','No transactions yet. Attend sessions to start earning points.');
  }
  content += '</div>';
  return renderShell(studentNav(), content, 'Points & Rewards');
}

function markAndJoin(sessionId, btn) {
  var url = btn.getAttribute('data-url');
  if (!url) return;
  window.open(url, '_blank', 'noopener');
  DB.markStudentJoined(sessionId).catch(function(){});
}

function renderStudentMessages() {
  if (isLoading('student-messages')) return renderShell(studentNav(), Spinner(), 'Messages');
  var d       = State.liveData['student-messages'] || {};
  var msgs    = d.messages || [];
  var tutorId = d.tutorId || null;

  var content = '<div class="page-header"><div><div class="page-title">Messages</div><div class="page-sub">All conversations are logged for safety</div></div></div>';
  content += '<div class="card" style="display:flex;flex-direction:column">';
  content += '<div style="overflow-y:auto;max-height:480px;padding:4px 0">';
  if (msgs.length) {
    content += msgs.map(function(m){
      var fromMe = m.sender_id === State.user.id;
      var name   = fromMe ? 'You' : (m.sender && m.sender.full_name ? esc(m.sender.full_name) : 'Unknown');
      return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+
        Avatar(name,'purple',32)+
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
        '<div style="font-size:13px;font-weight:600;color:var(--text-1)">'+name+'</div>'+
        '<div style="font-size:11px;color:var(--text-3)">'+timeAgo(m.created_at)+'</div></div>'+
        '<div style="font-size:13px;color:var(--text-2)">'+esc(m.content)+'</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-message-2','No messages yet. Your tutor will reach out before your first session.');
  }
  content += '</div>';
  if (tutorId) {
    content += '<div id="msg-compose" data-to="'+esc(tutorId)+'" style="padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center">';
    content += '<input class="input" id="msg-input" placeholder="Type a message..." maxlength="2000" style="flex:1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMsg();}" />';
    content += '<button class="btn btn-primary" onclick="sendMsg()"><i class="ti ti-send"></i></button>';
    content += '</div>';
  } else {
    content += '<div style="padding-top:12px;border-top:1px solid var(--border);font-size:13px;color:var(--text-3);text-align:center">You\'ll be able to message your tutor once one is assigned.</div>';
  }
  content += '</div>';
  return renderShell(studentNav(), content, 'Messages');
}

function renderStudentCalendar() {
  if (isLoading('student-calendar')) return renderShell(studentNav(), Spinner(), 'Calendar');
  var d        = State.liveData['student-calendar'] || {};
  var sessions = d.sessions || [];
  var homework = d.homework || [];

  var events = [];
  sessions.forEach(function(s) {
    if (!s.scheduled_at) return;
    events.push({
      date:  s.scheduled_at.split('T')[0],
      label: 'Session',
      type:  'session',
      time:  formatTime(s.scheduled_at),
      link:  s.meeting_link || null,
    });
  });
  homework.forEach(function(hw) {
    if (!hw.due_date) return;
    events.push({
      date:  hw.due_date,
      label: hw.title || 'Homework',
      type:  'homework',
      time:  null,
      link:  null,
    });
  });

  var content = '<div class="page-header"><div><div class="page-title">Calendar</div><div class="page-sub">Your sessions and homework deadlines</div></div></div>';
  content += '<div class="card">'+buildMonthGrid(events, 'student')+'</div>';
  return renderShell(studentNav(), content, 'Calendar');
}

function renderStudentHomework() {
  if (isLoading('student-homework')) return renderShell(studentNav(), Spinner(), 'Homework');
  var d       = State.liveData['student-homework'] || {};
  var homework = d.homework || [];
  var pending  = homework.filter(function(hw){ return hw.status === 'pending' || hw.status === 'assigned'; });
  var done     = homework.filter(function(hw){ return hw.status === 'submitted' || hw.status === 'completed'; });

  var content = '<div class="page-header"><div><div class="page-title">Homework</div><div class="page-sub">Assignments from your tutor</div></div></div>';

  if (!homework.length) {
    content += '<div class="card">'+EmptyState('ti-books','No homework assigned yet. Check back after your first session.')+'</div>';
    return renderShell(studentNav(), content, 'Homework');
  }

  if (pending.length) {
    content += '<div class="card mb-24"><div class="card-title">Pending</div>';
    content += pending.map(function(hw) {
      var tutorName = (hw.tutors && hw.tutors.users && hw.tutors.users.full_name) || 'Your tutor';
      var now       = new Date();
      var dueDate   = hw.due_date ? new Date(hw.due_date + 'T23:59:59') : null;
      var overdue   = dueDate && dueDate < now;
      return '<div style="padding:16px 0;border-bottom:1px solid var(--border-2)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px">' +
        '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">'+esc(hw.title)+'</div>' +
        '<div style="font-size:12px;color:var(--text-3);margin-bottom:6px"><i class="ti ti-calendar" style="font-size:11px"></i> Due: '+esc(hw.due_date||'—')+' &middot; '+esc(tutorName)+'</div>' +
        (hw.description ? '<div style="font-size:13px;color:var(--text-2);margin-bottom:6px">'+esc(hw.description)+'</div>' : '') +
        (hw.photo_url   ? '<div style="margin-bottom:6px"><img src="'+esc(hw.photo_url)+'" alt="Homework" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border)" /></div>' : '') +
        '</div>' +
        (overdue ? Badge('Overdue','r') : Badge('Due '+esc(hw.due_date||''),'a')) +
        '</div>' +
        '<div id="hw-submit-btn-'+hw.id+'">' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleSubmitForm(\''+hw.id+'\')"><i class="ti ti-upload"></i> Submit homework</button>' +
        '</div>' +
        '<div id="hw-submit-'+hw.id+'" class="hw-submit-form" style="display:none;margin-top:10px">' +
        '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px">Submit your work</div>' +
        '<textarea class="input" id="hw-note-'+hw.id+'" rows="3" placeholder="Add a note for your tutor (optional)..." style="margin-bottom:8px;resize:vertical"></textarea>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-2);padding:7px 14px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-2)">' +
        '<i class="ti ti-camera" style="color:var(--accent)"></i> Attach photo' +
        '<input type="file" accept="image/*" capture="environment" id="hw-photo-'+hw.id+'" style="display:none" />' +
        '</label>' +
        '<button id="hw-submit-btn-inner-'+hw.id+'" class="btn btn-primary btn-sm" onclick="doSubmitHomework(\''+hw.id+'\')"><i class="ti ti-send"></i> Submit</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleSubmitForm(\''+hw.id+'\')">Cancel</button>' +
        '</div></div>' +
        '</div>';
    }).join('');
    content += '</div>';
  }

  if (done.length) {
    content += '<div class="card"><div class="card-title">Submitted</div>';
    content += done.map(function(hw) {
      return '<div style="padding:12px 0;border-bottom:1px solid var(--border-2);display:flex;justify-content:space-between;align-items:center">' +
        '<div><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+esc(hw.title)+'</div>' +
        '<div style="font-size:11px;color:var(--text-3);margin-top:2px">Due: '+esc(hw.due_date||'—')+'</div></div>' +
        StatusBadge(hw.status) + '</div>';
    }).join('');
    content += '</div>';
  }

  return renderShell(studentNav(), content, 'Homework');
}

function sendMatchRequest(studentId, tutorId) {
  if (!studentId || !tutorId) return;
  DB.sendMatchRequest(studentId, tutorId).then(function(r) {
    if (r && r.error) { toast('Could not send request. Try again.','error'); return; }
    toast('Match request sent!','success');
    if (State.gated) { State.gated = false; }
    loadPageData('student-matches');
    render();
  }).catch(function(){ toast('Could not send request. Try again.','error'); });
}

function renderStudentMatches() {
  if (isLoading('student-matches')) return renderShell(studentNav(), Spinner(), 'Find Tutors');
  var d        = State.liveData['student-matches'] || {};
  var matches  = d.matches  || [];
  var requests = d.requests || [];
  var uid      = State.user && State.user.id;

  var reqMap = {};
  requests.forEach(function(r){ reqMap[r.tutor_id] = r; });

  var content = '<div class="page-header"><div><div class="page-title">Recommended tutors</div><div class="page-sub">Matched to your learning profile — send a request to express interest</div></div></div>';

  if (State.gated) {
    content += '<div class="alert-item warn mb-16"><i class="ti ti-lock alert-icon" style="color:var(--amber)"></i><div><div class="alert-title">Choose at least one tutor to apply to</div><div class="alert-body">You can request more than one — your portal unlocks as soon as you send your first request.</div></div></div>';
  }

  if (!matches.length) {
    content += '<div class="card">'+EmptyState('ti-star','No tutor matches yet. Your profile may still be in the matching queue — check back shortly.')+'</div>';
    return renderShell(studentNav(), content, 'Find Tutors');
  }

  content += matches.map(function(m, idx) {
    var tutor    = m.tutor  || {};
    var name     = (tutor.users && tutor.users.full_name) || 'Tutor';
    var score    = m.score  || 0;
    var isTop    = idx === 0;
    var subjects = Array.isArray(tutor.subjects) ? tutor.subjects : [];
    var subHtml  = subjects.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">' +
        subjects.map(function(s){ return '<span style="background:var(--teal-soft);color:var(--teal);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500">'+esc(s)+'</span>'; }).join('') +
        '</div>'
      : '';
    var refHtml = tutor.teacher_reference
      ? '<div style="font-size:12px;color:var(--text-3);font-style:italic;padding:8px 10px;background:var(--surface-2);border-radius:var(--r-sm);border-left:3px solid var(--border-2);margin-bottom:8px">'+esc(tutor.teacher_reference.slice(0,220))+'</div>'
      : '';
    var req = reqMap[tutor.id] || null;
    var reqHtml;
    if (!req) {
      reqHtml = '<button class="btn btn-primary btn-sm" onclick="sendMatchRequest(\''+esc(uid)+'\',\''+esc(tutor.id)+'\')"><i class="ti ti-send"></i> Request match</button>';
    } else if (req.status === 'pending') {
      reqHtml = '<span style="display:inline-flex;align-items:center;gap:5px;color:var(--text-3);font-size:13px"><i class="ti ti-clock"></i> Request sent</span>';
    } else if (req.status === 'accepted') {
      reqHtml = '<span style="display:inline-flex;align-items:center;gap:5px;color:var(--teal);font-size:13px;font-weight:600"><i class="ti ti-check"></i> Matched!</span>';
    } else {
      reqHtml = '<button class="btn btn-secondary btn-sm" onclick="sendMatchRequest(\''+esc(uid)+'\',\''+esc(tutor.id)+'\')"><i class="ti ti-send"></i> Request again</button>';
    }
    return '<div class="card mb-16'+(isTop?' card-hover':'')+'" style="'+(isTop?'border-color:rgba(74,140,122,0.4);':'')+'">' +
      '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:12px">' +
      Avatar(name,'green',44) +
      '<div style="flex:1">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text-1)">'+esc(name)+'</div>' +
      (isTop ? Badge('Best match','g') : '') +
      '</div>' +
      subHtml +
      (tutor.bio ? '<div style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:8px">'+esc(tutor.bio.slice(0,200))+(tutor.bio.length>200?'…':'')+'</div>' : '') +
      refHtml +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div style="display:inline-flex;align-items:center;gap:5px;background:var(--teal-soft);color:var(--teal);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">' +
      '<i class="ti ti-target-arrow" style="font-size:11px"></i> '+score+'% compatibility' +
      '</div>' + reqHtml + '</div>' +
      '</div></div>' +
      ProgressBar(score, score>=75?'teal':score>=50?'amber':'danger', 4) +
      '</div>';
  }).join('');

  content += '<div class="card" style="background:var(--accent-soft);border-color:rgba(107,76,59,0.2);margin-top:16px">';
  content += '<div style="display:flex;gap:12px;align-items:flex-start"><i class="ti ti-info-circle" style="color:var(--accent);font-size:20px;flex-shrink:0;margin-top:2px"></i>';
  content += '<div><div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:4px">About matching</div>';
  content += '<div style="font-size:13px;color:var(--text-2);line-height:1.6">You\'re matched based on subject, learning style, goals, and availability. Send a request to express interest — your tutor sees it and accepts or declines.</div></div></div>';
  content += '</div>';

  return renderShell(studentNav(), content, 'Find Tutors');
}

/* ============================================
   TUTOR PORTAL
   ============================================ */
function tutorNav() {
  return [
    {id:'tutor-dashboard', icon:'ti-layout-dashboard', label:'Dashboard'},
    {id:'tutor-calendar',  icon:'ti-calendar',         label:'Calendar'},
    {id:'tutor-students',  icon:'ti-users',            label:'My students'},
    {id:'tutor-requests',  icon:'ti-user-check',       label:'Requests'},
    {id:'tutor-notes',     icon:'ti-notes',            label:'Session notes'},
    {id:'tutor-hours',     icon:'ti-clock',            label:'Hour log'},
    {id:'tutor-homework',  icon:'ti-pencil-plus',      label:'Assign Homework'},
    {id:'tutor-messages',  icon:'ti-message-2',        label:'Messages'},
  ].map(function(i){
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+'</div>';
  }).join('');
}

function respondToMatchRequest(requestId, status, studentId, tutorId) {
  if (!requestId) return;
  DB.respondToMatchRequest(requestId, status, studentId, tutorId).then(function(r) {
    if (r && r.error) { toast('Could not update request. Try again.','error'); return; }
    toast(status === 'accepted' ? 'Student matched! They\'ve been assigned to you.' : 'Request declined.', status === 'accepted' ? 'success' : 'info');
    bustCache('tutor');
    loadPageData('tutor-requests');
    if (status === 'accepted') loadPageData('tutor-students');
  }).catch(function(){ toast('Could not update request. Try again.','error'); });
}

function renderTutorRequests() {
  if (isLoading('tutor-requests')) return renderShell(tutorNav(), Spinner(), 'Match Requests');
  var d        = State.liveData['tutor-requests'] || {};
  var requests = d.requests || [];
  var pending  = requests.filter(function(r){ return r.status === 'pending'; });
  var history  = requests.filter(function(r){ return r.status !== 'pending'; });

  var content = '<div class="page-header"><div><div class="page-title">Match requests</div><div class="page-sub">Students who want to work with you — accept to be assigned as their tutor</div></div></div>';

  if (!pending.length && !history.length) {
    content += '<div class="card">'+EmptyState('ti-user-check','No match requests yet. When students express interest, their requests will appear here.')+'</div>';
    return renderShell(tutorNav(), content, 'Match Requests');
  }

  if (pending.length) {
    content += '<div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Pending ('+pending.length+')</div>';
    content += pending.map(function(r) {
      var student = r.students || {};
      var sName   = (student.users && student.users.full_name) || 'Student';
      var grade   = student.grade ? 'Grade '+student.grade : '';
      var subject = student.subject || '';
      var meta    = [grade, subject].filter(Boolean).join(' · ');
      return '<div class="card mb-12">' +
        '<div style="display:flex;gap:12px;align-items:center">' +
        Avatar(sName,'purple',38) +
        '<div style="flex:1">' +
        '<div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:2px">'+esc(sName)+'</div>' +
        (meta ? '<div style="font-size:12px;color:var(--text-3)">'+esc(meta)+'</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-secondary" onclick="respondToMatchRequest(\''+r.id+'\',\'declined\',\''+r.student_id+'\',\''+r.tutor_id+'\')"><i class="ti ti-x"></i> Decline</button>' +
        '<button class="btn btn-sm btn-primary" onclick="respondToMatchRequest(\''+r.id+'\',\'accepted\',\''+r.student_id+'\',\''+r.tutor_id+'\')"><i class="ti ti-check"></i> Accept</button>' +
        '</div></div></div>';
    }).join('');
  }

  if (history.length) {
    content += '<div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin:20px 0 12px">History</div>';
    content += history.map(function(r) {
      var student   = r.students || {};
      var sName     = (student.users && student.users.full_name) || 'Student';
      var accepted  = r.status === 'accepted';
      return '<div class="card mb-12" style="opacity:0.75">' +
        '<div style="display:flex;gap:12px;align-items:center">' +
        Avatar(sName,'purple',32) +
        '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+esc(sName)+'</div></div>' +
        (accepted ? Badge('Accepted','g') : Badge('Declined','r')) +
        '</div></div>';
    }).join('');
  }

  return renderShell(tutorNav(), content, 'Match Requests');
}

function renderTutorDashboard() {
  if (isLoading('tutor-dashboard')) return renderShell(tutorNav(), Spinner(), 'Dashboard');
  var d        = State.liveData['tutor-dashboard'] || {};
  var tutor    = d.tutor    || {};
  var students = d.students || [];
  var sessions = d.sessions || [];
  var hours    = d.hours    || [];
  var name     = (tutor.users && tutor.users.full_name) || State.user.name;
  var firstName = (name||'').split(' ')[0];
  var upcoming = sessions.filter(function(s){ return s.status === 'upcoming'; });
  var monthHrs = hours.reduce(function(acc,h){ return acc + (parseFloat(h.hours_logged)||0); }, 0).toFixed(1);

  var content = '<div class="page-header"><div><div class="page-title">Good afternoon, '+esc(firstName)+'</div><div class="page-sub">'+students.length+' active student'+(students.length!==1?'s':'')+' · '+upcoming.length+' upcoming session'+(upcoming.length!==1?'s':'')+'</div></div><button class="btn btn-primary" onclick="navigate(\'tutor-notes\')"><i class="ti ti-notes"></i> New session note</button></div>';

  content += '<div class="stat-grid mb-24">';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-users"></i></div><div class="stat-val">'+students.length+'</div><div class="stat-lbl">Active students</div></div>';
  content += '<div class="stat-card"><div class="stat-icon v"><i class="ti ti-clock"></i></div><div class="stat-val">'+monthHrs+'h</div><div class="stat-lbl">Hours logged</div></div>';
  content += '<div class="stat-card"><div class="stat-icon a"><i class="ti ti-calendar-check"></i></div><div class="stat-val">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="stat-lbl">Sessions done</div></div>';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-calendar"></i></div><div class="stat-val">'+upcoming.length+'</div><div class="stat-lbl">Upcoming</div></div>';
  content += '</div>';

  content += '<div class="grid-2 mb-24">';

  content += '<div class="card"><div class="card-title">Upcoming sessions</div>';
  if (upcoming.length) {
    content += upcoming.slice(0,3).map(function(s){
      return '<div class="session-card"><div class="session-time"><div class="session-time-val">'+formatTime(s.scheduled_at)+'</div><div class="session-time-day">'+formatDate(s.scheduled_at)+'</div></div><div class="session-body"><div class="session-student">Session</div><div class="session-meta"><i class="ti ti-clock"></i>'+(s.duration_minutes||60)+' min</div></div>'+(s.meeting_link?'<a class="btn btn-primary btn-sm" href="'+esc(s.meeting_link)+'" target="_blank" rel="noopener"><i class="ti ti-video"></i></a>':'')+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-calendar','No upcoming sessions.');
  }
  content += '</div>';

  content += '<div class="card"><div class="card-title">My students</div>';
  if (students.length) {
    content += students.map(function(s){
      var sName = (s.users && s.users.full_name) || 'Student';
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+Avatar(sName,'purple',36)+'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:2px">'+esc(sName)+'</div><div style="font-size:11px;color:var(--text-3)">'+(s.subject?esc(s.subject)+' · ':'')+('Grade '+(s.grade||'—'))+'</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-users','No students assigned yet.');
  }
  content += '</div></div>';

  // Accepting new students toggle
  var accepting = tutor.accepting_new_students !== false;
  content += '<div class="card" style="margin-top:16px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">';
  content += '<div><div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:3px">Accept new students</div>';
  content += '<div style="font-size:12px;color:var(--text-3)">'+(accepting?'You are visible in the matching pool for new students':'Paused — existing students are unaffected')+'</div></div>';
  content += '<button class="btn '+(accepting?'btn-secondary':'btn-primary')+' btn-sm" onclick="toggleAcceptingStudents()">';
  content += '<i class="ti '+(accepting?'ti-pause':'ti-player-play')+'"></i> '+(accepting?'Pause new matches':'Resume new matches');
  content += '</button></div>';

  return renderShell(tutorNav(), content, 'Dashboard');
}

function renderTutorCalendar() {
  if (isLoading('tutor-calendar')) return renderShell(tutorNav(), Spinner(), 'Calendar');
  var d        = State.liveData['tutor-calendar'] || {};
  var students = d.students || [];
  var sessions = d.sessions || [];
  var homework = d.homework || [];

  // Build events for the month grid
  var events = [];
  sessions.forEach(function(s) {
    if (!s.scheduled_at) return;
    var sName = (s.students && s.students.users && s.students.users.full_name) || 'Session';
    events.push({
      date:  s.scheduled_at.split('T')[0],
      label: sName,
      type:  'session',
      time:  formatTime(s.scheduled_at) + ' · ' + (s.duration_minutes||60) + ' min',
      link:  s.meeting_link || null,
    });
  });
  homework.forEach(function(hw) {
    if (!hw.due_date) return;
    var sName = (hw.students && hw.students.users && hw.students.users.full_name) || 'Student';
    events.push({
      date:  hw.due_date,
      label: (hw.title || 'Homework') + ' – ' + sName,
      type:  'homework',
      time:  null,
      link:  null,
    });
  });

  var content = '<div class="page-header"><div><div class="page-title">Calendar</div><div class="page-sub">Sessions and homework deadlines</div></div><button class="btn btn-primary" onclick="toggleBookingForm()"><i class="ti ti-plus"></i> Book session</button></div>';

  // Booking form — hidden until the button is clicked
  content += '<div id="booking-form-wrap" style="display:none"><div class="card mb-24"><div class="card-title">Book a session</div>';
  content += '<div class="grid-2">';
  content += '<div class="input-group"><label class="input-label">Student</label><select class="select" id="book-student"><option value="">Select a student...</option>';
  content += students.map(function(s){
    return '<option value="'+esc(s.id)+'">'+(s.users&&s.users.full_name?esc(s.users.full_name):'Unknown')+'</option>';
  }).join('');
  content += '</select></div>';
  content += '<div class="input-group"><label class="input-label">Date &amp; time</label><input class="input" type="datetime-local" id="book-datetime" /></div>';
  content += '<div class="input-group"><label class="input-label">Duration</label><select class="select" id="book-duration"><option value="45">45 minutes</option><option value="60" selected>60 minutes</option><option value="90">90 minutes</option></select></div>';
  content += '<div class="input-group"><label class="input-label">Meeting link (Zoom / Google Meet)</label><input class="input" id="book-link" placeholder="https://meet.google.com/..." maxlength="500" /></div>';
  content += '</div>';
  content += '<div style="display:flex;gap:8px;margin-top:4px"><button class="btn btn-primary" onclick="bookSession()"><i class="ti ti-calendar-plus"></i> Confirm booking</button><button class="btn btn-secondary" onclick="toggleBookingForm()">Cancel</button></div>';
  content += '</div></div>';

  // Month grid — replaces the two-column list layout
  content += '<div class="card">'+buildMonthGrid(events, 'tutor')+'</div>';

  return renderShell(tutorNav(), content, 'Calendar');
}

function toggleBookingForm() {
  var wrap = document.getElementById('booking-form-wrap');
  if (wrap) wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
}

function bookSession() {
  var uid       = State.user && State.user.id;
  var studentId = (document.getElementById('book-student')||{}).value||'';
  var datetime  = (document.getElementById('book-datetime')||{}).value||'';
  var duration  = (document.getElementById('book-duration')||{}).value||'60';
  var link      = (document.getElementById('book-link')||{}).value||'';

  if (!studentId) { toast('Please select a student.', 'error'); return; }
  if (!datetime)  { toast('Please select a date and time.', 'error'); return; }

  var scheduledAt = new Date(datetime).toISOString();
  var btn = document.querySelector('[onclick="bookSession()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Saving...'; }

  DB.createSession(uid, studentId, scheduledAt, parseInt(duration, 10), link || null)
    .then(function(r) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-calendar-plus"></i> Confirm booking'; }
      if (r && r.error) { toast('Could not book session. Try again.', 'error'); return; }
      toast('Session booked.', 'success');
      toggleBookingForm();
      bustCache('tutor');
      loadPageData('tutor-calendar');
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-calendar-plus"></i> Confirm booking'; }
      toast('Something went wrong. Please try again.', 'error');
    });
}

function renderTutorMessages() {
  if (isLoading('tutor-messages')) return renderShell(tutorNav(), Spinner(), 'Messages');
  var d        = State.liveData['tutor-messages'] || {};
  var msgs     = d.messages || [];
  var students = d.students || [];
  var parents  = d.parents  || [];

  var content = '<div class="page-header"><div><div class="page-title">Messages</div><div class="page-sub">Conversations with students</div></div></div>';
  content += '<div class="card" style="display:flex;flex-direction:column">';
  content += '<div style="overflow-y:auto;max-height:480px;padding:4px 0">';
  if (msgs.length) {
    content += msgs.map(function(m){
      var fromMe = m.sender_id === State.user.id;
      var name   = fromMe ? 'You' : esc((m.sender && m.sender.full_name) || 'Unknown');
      return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+
        Avatar(fromMe ? State.user.name : ((m.sender && m.sender.full_name)||'?'), 'green', 32)+
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
        '<div style="font-size:13px;font-weight:600;color:var(--text-1)">'+name+'</div>'+
        '<div style="font-size:11px;color:var(--text-3)">'+timeAgo(m.created_at)+'</div></div>'+
        '<div style="font-size:13px;color:var(--text-2)">'+esc(m.content)+'</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-message-2','No messages yet. Send a message to one of your students below.');
  }
  content += '</div>';
  var recipients = [];
  students.forEach(function(s){
    recipients.push({ id: s.id, label: ((s.users && s.users.full_name) || 'Student') + ' (student)' });
  });
  parents.forEach(function(p){
    recipients.push({ id: p.id, label: (p.full_name || 'Parent') + ' (parent)' });
  });
  if (recipients.length) {
    content += '<div id="msg-compose" data-to="'+esc(recipients[0].id)+'" style="padding-top:12px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px">';
    content += '<select class="select" style="font-size:13px" onchange="document.getElementById(\'msg-compose\').setAttribute(\'data-to\',this.value)">';
    content += recipients.map(function(rc){
      return '<option value="'+esc(rc.id)+'">'+esc(rc.label)+'</option>';
    }).join('');
    content += '</select>';
    content += '<div style="display:flex;gap:8px;align-items:center">';
    content += '<input class="input" id="msg-input" placeholder="Type a message..." maxlength="2000" style="flex:1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMsg();}" />';
    content += '<button class="btn btn-primary" onclick="sendMsg()"><i class="ti ti-send"></i></button>';
    content += '</div></div>';
  } else {
    content += '<div style="padding-top:12px;border-top:1px solid var(--border);font-size:13px;color:var(--text-3);text-align:center">No students assigned yet.</div>';
  }
  content += '</div>';
  return renderShell(tutorNav(), content, 'Messages');
}

function renderTutorStudents() {
  if (isLoading('tutor-students')) return renderShell(tutorNav(), Spinner(), 'My Students');
  var d = State.liveData['tutor-students'] || {};
  var students = d.students || [];
  var content = '<div class="page-header"><div><div class="page-title">My students</div><div class="page-sub">'+students.length+' student'+(students.length!==1?'s':'')+' assigned to you</div></div></div>';
  content += '<div class="card">';
  if (students.length) {
    content += '<div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Subject</th><th>Grade</th><th>Goal</th></tr></thead><tbody>';
    content += students.map(function(s){
      var sName = (s.users && s.users.full_name) || 'Student';
      return '<tr><td class="table-name">'+Avatar(sName,'purple',30)+'<div><div style="font-size:13px;font-weight:600">'+esc(sName)+'</div></div></td><td>'+(s.subject?esc(s.subject):'—')+'</td><td>'+(s.grade||'—')+'</td><td style="max-width:200px;font-size:12px;color:var(--text-2)">'+(s.goal_description?esc(s.goal_description.slice(0,60))+(s.goal_description.length>60?'…':''):'—')+'</td></tr>';
    }).join('');
    content += '</tbody></table></div>';
  } else {
    content += EmptyState('ti-users','No students assigned yet.');
  }
  content += '</div>';
  return renderShell(tutorNav(), content, 'My Students');
}

var CHECKLIST_TOPICS = [
  'Covered main topic',
  'Reviewed previous homework',
  'Identified gaps or struggles',
  'Assigned new homework',
  'Set focus for next session',
];

function renderTutorNotes() {
  if (isLoading('tutor-notes')) return renderShell(tutorNav(), Spinner(), 'Session Notes');
  State.hwAssigned = null;
  var d        = State.liveData['tutor-notes'] || {};
  var sessions = d.sessions || [];
  var content = '<div class="page-header"><div><div class="page-title">Session notes</div><div class="page-sub">Complete the checklist — AI drafts the note for you</div></div></div>';
  content += '<div class="grid-2">';
  content += '<div>';
  content += '<div class="card mb-16"><div class="card-title">Session details</div>';
  content += '<div class="input-group"><label class="input-label">Session</label><select class="select" id="note-session"><option value="">Select a session...</option>';
  content += sessions.map(function(s){
    var sName = (s.students && s.students.users && s.students.users.full_name) || '';
    return '<option value="'+esc(s.id)+'">'+formatDate(s.scheduled_at)+' '+formatTime(s.scheduled_at)+(sName?' — '+esc(sName):'')+'</option>';
  }).join('');
  content += '</select></div>';
  content += '<div class="input-group"><label class="input-label">Session date</label><input class="input" type="date" id="note-date" value="'+new Date().toISOString().split('T')[0]+'" /></div>';
  content += '<div class="input-group"><label class="input-label">Duration</label><select class="select" id="note-duration"><option>45 minutes</option><option selected>60 minutes</option><option>90 minutes</option></select></div></div>';
  content += '<div class="card mb-16"><div class="card-title">What was covered</div>';
  content += CHECKLIST_TOPICS.map(function(t,i){
    return '<div class="checklist-item" data-check="'+i+'" onclick="toggleCheck('+i+')"><div class="checklist-cb"></div><div class="checklist-text">'+esc(t)+'</div></div>';
  }).join('');
  content += '</div>';
  content += '<div class="card mb-16"><div class="card-title">Understanding & notes</div>';
  content += '<div class="input-group"><label class="input-label">Understanding (1–5)</label><select class="select" id="rating-select"><option>5 — Excellent</option><option>4 — Good</option><option selected>3 — Moderate</option><option>2 — Struggled</option><option>1 — Did not grasp</option></select></div>';
  content += '<div class="input-group"><label class="input-label">Flag for next session</label><input class="input" id="note-flag" placeholder="e.g. Negative coefficients need more work" maxlength="300" /></div>';
  content += '<div class="input-group"><label class="input-label">Did you assign homework in this session?</label><div style="display:flex;gap:8px;margin-top:4px"><button id="hw-yes" class="btn btn-secondary" style="flex:1" onclick="setHwToggle(true)"><i class="ti ti-check"></i> Yes</button><button id="hw-no" class="btn btn-secondary" style="flex:1" onclick="setHwToggle(false)"><i class="ti ti-x"></i> No</button></div></div></div>';
  content += '<button class="btn btn-primary" style="width:100%" onclick="generateNote()"><i class="ti ti-sparkles"></i> Generate session note</button>';
  content += '</div>';
  content += '<div class="card" id="note-output"><div class="card-title">Drafted note</div>'+EmptyState('ti-file-text','Complete the checklist and click Generate — your session note will appear here.')+'</div>';
  content += '</div>';
  return renderShell(tutorNav(), content, 'Session Notes');
}

function generateNote() {
  var flag = (document.getElementById('note-flag')||{}).value||'';
  var hw   = State.hwAssigned;
  var date = (document.getElementById('note-date')||{}).value||new Date().toLocaleDateString();
  var noteEl = document.getElementById('note-output');
  if (!noteEl) return;
  var checked = Array.from(State.checklistChecked).map(function(i){ return CHECKLIST_TOPICS[i]; });
  noteEl.innerHTML = '<div class="card-title" style="display:flex;justify-content:space-between;align-items:center">Drafted note<span style="font-size:11px;color:var(--teal);display:flex;align-items:center;gap:4px"><i class="ti ti-check-circle"></i> Ready to review</span></div>';
  noteEl.innerHTML += '<div style="font-size:13px;line-height:1.8;color:var(--text-2);background:var(--surface-2);border-radius:var(--r-md);padding:16px;margin-bottom:14px"><strong style="color:var(--text-1)">Session — '+esc(date)+'</strong><br><br>';
  if (checked.length) noteEl.innerHTML += 'Topics covered this session: '+esc(checked.join(', '))+'.<br><br>';
  if (flag)           noteEl.innerHTML += '<strong style="color:var(--amber)">Flag for next session:</strong> '+esc(flag)+'<br>';
  if (hw !== null)    noteEl.innerHTML += '<strong style="color:var(--text-1)">Homework assigned:</strong> '+(hw ? 'Yes' : 'No');
  noteEl.innerHTML += '</div>';
  noteEl.innerHTML += '<div style="display:flex;gap:8px"><button id="note-save-btn" class="btn btn-success" style="flex:1" onclick="saveTutorNote()"><i class="ti ti-check"></i> Approve & save</button></div>';
}

function saveTutorNote() {
  var sessionId = (document.getElementById('note-session')||{}).value||'';
  if (!sessionId) { toast('Please select a session first.','error'); return; }
  var ratingRaw = (document.getElementById('rating-select')||{}).value||'3';
  var rating    = parseInt(ratingRaw.charAt(0), 10) || 3;
  var flag      = (document.getElementById('note-flag')||{}).value||'';
  var checked   = Array.from(State.checklistChecked).map(function(i){ return CHECKLIST_TOPICS[i]; });
  var btn = document.getElementById('note-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> Saving...'; }
  DB.saveSessionNote({
    session_id:           sessionId,
    topics_covered:       checked.join(', '),
    understanding_rating: rating,
    flag_for_next:        flag,
    homework_assigned:    State.hwAssigned === true,
    final_note:           checked.length ? 'Topics covered: ' + checked.join(', ') + (flag ? '. Flag: ' + flag : '') : (flag || ''),
  }).then(function(r) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Approve & save'; }
    if (r && r.error) { toast('Could not save note. Try again.','error'); return; }
    toast('Session note saved.','success');
    State.checklistChecked = new Set();
    State.hwAssigned = null;
    loadPageData('tutor-notes');
    render();
  }).catch(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Approve & save'; }
    toast('Something went wrong.','error');
  });
}

function setHwToggle(val) {
  State.hwAssigned = val;
  var yes = document.getElementById('hw-yes');
  var no  = document.getElementById('hw-no');
  if (yes) yes.className = 'btn ' + (val  ? 'btn-primary'   : 'btn-secondary');
  if (no)  no.className  = 'btn ' + (!val ? 'btn-primary'   : 'btn-secondary');
}

function renderTutorHours() {
  if (isLoading('tutor-hours')) return renderShell(tutorNav(), Spinner(), 'Hour Log');
  var d     = State.liveData['tutor-hours'] || {};
  var hours = d.hours    || [];
  var sessions = d.sessions || [];
  var totalHrs = hours.reduce(function(acc,h){ return acc + (parseFloat(h.hours_logged)||0); }, 0).toFixed(1);
  var content = '<div class="page-header"><div><div class="page-title">Hour log</div><div class="page-sub">Every session logged automatically — export anytime for grant reporting</div></div><button class="btn btn-primary" onclick="toast(\'PDF export coming soon.\',\'info\')"><i class="ti ti-download"></i> Export PDF</button></div>';
  content += '<div class="stat-grid mb-24">';
  content += '<div class="stat-card"><div class="stat-icon v"><i class="ti ti-clock"></i></div><div class="stat-val">'+totalHrs+'h</div><div class="stat-lbl">Total logged</div></div>';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-calendar-check"></i></div><div class="stat-val">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="stat-lbl">Sessions completed</div></div>';
  content += '</div>';
  content += '<div class="card"><div class="card-title">Session log</div>';
  if (hours.length) {
    content += '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Hours</th></tr></thead><tbody>';
    content += hours.map(function(h){
      return '<tr><td>'+esc(h.session_date)+'</td><td>'+h.hours_logged+'h</td></tr>';
    }).join('');
    content += '</tbody></table></div>';
  } else {
    content += EmptyState('ti-clock','No hours logged yet. Hours are recorded automatically when sessions are completed.');
  }
  content += '</div>';
  return renderShell(tutorNav(), content, 'Hour Log');
}

function renderTutorHomework() {
  if (isLoading('tutor-homework')) return renderShell(tutorNav(), Spinner(), 'Assign Homework');
  var d        = State.liveData['tutor-homework'] || {};
  var students = d.students || [];
  var hwList   = d.homework || [];

  var content = '<div class="page-header"><div><div class="page-title">Assign Homework</div><div class="page-sub">Attach a photo, type a description, or both</div></div></div>';
  content += '<div class="grid-2">';

  content += '<div class="card"><div class="card-title">New assignment</div>';
  content += '<div class="input-group"><label class="input-label">Student</label><select class="select" id="hw-student"><option value="">Select a student...</option>';
  content += students.map(function(s){
    var name = (s.users && s.users.full_name) || 'Unknown';
    return '<option value="'+esc(s.id)+'">'+esc(name)+'</option>';
  }).join('');
  content += '</select></div>';
  content += '<div class="input-group"><label class="input-label">Title</label><input class="input" id="hw-title" placeholder="e.g. Quadratic equations — practice set A" maxlength="200" /></div>';
  content += '<div class="input-group"><label class="input-label">Due date</label><input class="input" type="date" id="hw-due" /></div>';
  content += '<div class="input-group"><label class="input-label">Description (optional)</label><textarea class="input" id="hw-desc" rows="4" placeholder="Additional instructions or notes for the student..." style="resize:vertical;min-height:80px" maxlength="2000"></textarea></div>';
  content += '<div class="input-group"><label class="input-label">Photo (optional)</label>';
  content += '<label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px dashed var(--border);border-radius:var(--r-md);cursor:pointer;background:var(--surface-2)">';
  content += '<i class="ti ti-camera" style="font-size:22px;color:var(--accent);flex-shrink:0"></i>';
  content += '<div><div style="font-size:13px;font-weight:500;color:var(--text-1)">Take a photo or upload file</div><div style="font-size:12px;color:var(--text-3);margin-top:2px">Opens camera on mobile</div></div>';
  content += '<input type="file" accept="image/*" capture="environment" id="hw-photo" style="display:none" onchange="previewHwPhoto(this)" />';
  content += '</label>';
  content += '<div id="hw-photo-preview" style="margin-top:8px"></div>';
  content += '</div>';
  content += '<button class="btn btn-primary" style="width:100%" onclick="submitHomework()"><i class="ti ti-send"></i> Assign homework</button>';
  content += '</div>';

  content += '<div class="card"><div class="card-title">Recently assigned</div>';
  if (hwList.length) {
    content += hwList.map(function(hw){
      var sName = (hw.students && hw.students.users && hw.students.users.full_name) || 'Unknown';
      return '<div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start">'+
        '<div><div style="font-size:14px;font-weight:600;color:var(--text-1)">'+esc(hw.title)+'</div>'+
        '<div style="font-size:12px;color:var(--text-3);margin-top:3px">'+esc(sName)+' &middot; Due '+esc(hw.due_date || '')+'</div>'+
        (hw.description ? '<div style="font-size:12px;color:var(--text-2);margin-top:4px">'+esc(hw.description)+'</div>' : '')+
        (hw.photo_url   ? '<div style="margin-top:6px"><img src="'+esc(hw.photo_url)+'" alt="Homework photo" style="max-width:100%;max-height:120px;border-radius:var(--r-md);border:1px solid var(--border)" /></div>' : '')+
        '</div>'+StatusBadge(hw.status || 'pending')+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-books','No homework assigned yet.');
  }
  content += '</div>';

  content += '</div>';
  return renderShell(tutorNav(), content, 'Assign Homework');
}

function previewHwPhoto(input) {
  var preview = document.getElementById('hw-photo-preview');
  if (!preview) return;
  if (!input.files || !input.files[0]) { preview.innerHTML = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    preview.innerHTML = '<img src="'+e.target.result+'" alt="Preview" style="max-width:100%;max-height:180px;border-radius:var(--r-md);border:1px solid var(--border)" />';
  };
  reader.readAsDataURL(input.files[0]);
}

function submitHomework() {
  var uid       = State.user && State.user.id;
  var studentEl = document.getElementById('hw-student');
  var titleEl   = document.getElementById('hw-title');
  var descEl    = document.getElementById('hw-desc');
  var dueEl     = document.getElementById('hw-due');
  var photoEl   = document.getElementById('hw-photo');

  var studentId = studentEl ? studentEl.value : '';
  var title     = titleEl   ? titleEl.value.trim()   : '';
  var desc      = descEl    ? descEl.value.trim()    : '';
  var dueDate   = dueEl     ? dueEl.value            : '';
  var photoFile = photoEl && photoEl.files && photoEl.files[0] ? photoEl.files[0] : null;

  if (!studentId) { toast('Please select a student.', 'error'); return; }
  if (!title)     { toast('Please enter a title for the homework.', 'error'); return; }
  if (!dueDate)   { toast('Please select a due date.', 'error'); return; }

  var btn = document.querySelector('[onclick="submitHomework()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Saving...'; }

  DB.assignHomework(uid, studentId, title, desc || null, photoFile, dueDate)
    .then(function(r) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Assign homework'; }
      if (r && r.error) { toast('Could not save homework. Try again.', 'error'); return; }
      toast('Homework assigned successfully.', 'success');
      if (studentEl)  studentEl.value = '';
      if (titleEl)    titleEl.value   = '';
      if (descEl)     descEl.value    = '';
      if (dueEl)      dueEl.value     = '';
      if (photoEl)    photoEl.value   = '';
      var prev = document.getElementById('hw-photo-preview');
      if (prev) prev.innerHTML = '';
      loadPageData('tutor-homework');
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Assign homework'; }
      toast('Something went wrong. Please try again.', 'error');
    });
}

/* ============================================
   PARENT PORTAL
   ============================================ */
function parentNav() {
  return [
    {id:'parent-dashboard', icon:'ti-layout-dashboard', label:'Dashboard'},
    {id:'parent-progress',  icon:'ti-chart-line',       label:'Progress'},
    {id:'parent-sessions',  icon:'ti-calendar',         label:'Sessions'},
    {id:'parent-messages',  icon:'ti-message-2',        label:'Messages'},
  ].map(function(i){
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+'</div>';
  }).join('');
}

function renderParentDashboard() {
  if (isLoading('parent-dashboard')) return renderShell(parentNav(), Spinner(), 'Dashboard');
  var d        = State.liveData['parent-dashboard'] || {};
  var students = d.students || [];
  var child    = students[0] || {};
  var childName = (child.users && child.users.full_name) || 'your child';
  var skills   = child.skill_map || [];
  var sessions = child.sessions  || [];

  var content = '<div class="page-header"><div><div class="page-title">Hello, '+esc(State.user.name.split(' ')[0])+'</div><div class="page-sub">Viewing progress for '+esc(childName)+'</div></div></div>';

  if (!students.length) {
    content += '<div class="card">'+EmptyState('ti-users','Your child\'s profile has not been linked yet. Contact your program administrator.')+'</div>';
    return renderShell(parentNav(), content, 'Dashboard');
  }

  content += '<div class="stat-grid mb-24">';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-target-arrow"></i></div><div class="stat-val">'+(child.attendance_streak||0)+'</div><div class="stat-lbl">Week streak</div></div>';
  content += '<div class="stat-card"><div class="stat-icon v"><i class="ti ti-calendar-check"></i></div><div class="stat-val">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="stat-lbl">Sessions attended</div></div>';
  content += '<div class="stat-card"><div class="stat-icon a"><i class="ti ti-star"></i></div><div class="stat-val">'+skills.filter(function(sk){return sk.status==='mastered';}).length+'</div><div class="stat-lbl">Skills mastered</div></div>';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-coins"></i></div><div class="stat-val">'+(child.points_balance||0)+'</div><div class="stat-lbl">Points balance</div></div>';
  content += '</div>';

  var upcomingSessions = sessions.filter(function(s){ return s.status === 'upcoming'; });
  if (upcomingSessions.length) {
    content += '<div class="card mb-24"><div class="card-title">Upcoming sessions</div>';
    content += upcomingSessions.map(function(s){
      return '<div class="session-card"><div class="session-time"><div class="session-time-val">'+formatTime(s.scheduled_at)+'</div><div class="session-time-day">'+formatDate(s.scheduled_at)+'</div></div><div class="session-body"><div class="session-student">'+esc(childName)+'</div><div class="session-meta"><i class="ti ti-clock"></i> '+(s.duration_minutes||60)+' min <i class="ti ti-video"></i> Online</div></div>'+sessionAttendanceBadge(s)+'</div>';
    }).join('');
    content += '</div>';
  }

  content += '<div class="card"><div class="card-title">Skill map</div>';
  if (skills.length) {
    content += skills.map(function(sk){
      return '<div class="skill-row"><div class="skill-name">'+esc(sk.skill_name)+'</div><div class="skill-bar-wrap">'+ProgressBar(sk.progress_pct,sk.status==='mastered'?'mastered':sk.status==='progress'?'progress':'danger')+'</div><div class="skill-pct">'+sk.progress_pct+'%</div>'+StatusBadge(sk.status)+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-chart-line','Skill map will appear after the first session.');
  }
  content += '</div>';

  return renderShell(parentNav(), content, 'Dashboard');
}

function renderParentProgress() {
  if (isLoading('parent-progress')) return renderShell(parentNav(), Spinner(), 'Progress');
  var d = State.liveData['parent-progress'] || {};
  var child = (d.students||[])[0] || {};
  var skills = child.skill_map || [];
  var content = '<div class="page-header"><div><div class="page-title">Progress</div></div></div><div class="card">';
  if (skills.length) {
    content += skills.map(function(sk){
      return '<div class="skill-row"><div class="skill-name">'+esc(sk.skill_name)+'</div><div class="skill-bar-wrap">'+ProgressBar(sk.progress_pct,sk.status==='mastered'?'mastered':sk.status==='progress'?'progress':'danger')+'</div><div class="skill-pct">'+sk.progress_pct+'%</div>'+StatusBadge(sk.status)+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-chart-line','No skill data yet.');
  }
  content += '</div>';
  return renderShell(parentNav(), content, 'Progress');
}

function renderParentSessions() {
  if (isLoading('parent-sessions')) return renderShell(parentNav(), Spinner(), 'Sessions');
  var d = State.liveData['parent-sessions'] || {};
  var child = (d.students||[])[0] || {};
  var sessions = child.sessions || [];
  var childName2 = (child.users && child.users.full_name) || 'your child';
  var content = '<div class="page-header"><div><div class="page-title">Sessions</div><div class="page-sub">All sessions for '+esc(childName2)+'</div></div></div><div class="card">';
  if (sessions.length) {
    content += sessions.map(function(s){
      return '<div class="session-card"><div class="session-time"><div class="session-time-val">'+formatTime(s.scheduled_at)+'</div><div class="session-time-day">'+formatDate(s.scheduled_at)+'</div></div><div class="session-body"><div class="session-student">'+esc(childName2)+'</div><div class="session-meta"><i class="ti ti-clock"></i> '+(s.duration_minutes||60)+' min</div></div>'+sessionAttendanceBadge(s)+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-calendar','No sessions scheduled yet.');
  }
  content += '</div>';
  return renderShell(parentNav(), content, 'Sessions');
}

function renderParentMessages() {
  if (isLoading('parent-messages')) return renderShell(parentNav(), Spinner(), 'Messages');
  var d          = State.liveData['parent-messages'] || {};
  var msgs       = d.messages || [];
  var tutorId    = d.tutorId || null;

  var content = '<div class="page-header"><div><div class="page-title">Messages</div><div class="page-sub">Messages with your child\'s tutor</div></div></div>';
  content += '<div class="card" style="display:flex;flex-direction:column">';
  content += '<div style="overflow-y:auto;max-height:480px;padding:4px 0">';
  if (msgs.length) {
    content += msgs.map(function(m){
      var fromMe = m.sender_id === State.user.id;
      var name   = fromMe ? 'You' : (m.sender && m.sender.full_name ? esc(m.sender.full_name) : 'Unknown');
      return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+
        Avatar(name,'amber',32)+
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
        '<div style="font-size:13px;font-weight:600;color:var(--text-1)">'+name+'</div>'+
        '<div style="font-size:11px;color:var(--text-3)">'+timeAgo(m.created_at)+'</div></div>'+
        '<div style="font-size:13px;color:var(--text-2)">'+esc(m.content)+'</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-message-2','No messages yet. Your child\'s tutor will reach out with updates.');
  }
  content += '</div>';
  if (tutorId) {
    content += '<div id="msg-compose" data-to="'+esc(tutorId)+'" style="padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center">';
    content += '<input class="input" id="msg-input" placeholder="Message your child\'s tutor..." maxlength="2000" style="flex:1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMsg();}" />';
    content += '<button class="btn btn-primary" onclick="sendMsg()"><i class="ti ti-send"></i></button>';
    content += '</div>';
  } else {
    content += '<div style="padding-top:12px;border-top:1px solid var(--border);font-size:13px;color:var(--text-3);text-align:center">Messaging will be available once a tutor is assigned.</div>';
  }
  content += '</div>';
  return renderShell(parentNav(), content, 'Messages');
}

/* ============================================
   ADMIN PORTAL
   ============================================ */
function adminNav() {
  var d = State.liveData['admin-dashboard'] || {};
  var pendingUsers = (d.users||[]).filter(function(u){ return !u.is_approved; }).length;
  var pendingRewards = (d.rewardRequests||[]).length;
  return [
    {id:'admin-dashboard', icon:'ti-layout-dashboard', label:'Command center', badge: pendingUsers},
    {id:'admin-students',  icon:'ti-users',            label:'Students'},
    {id:'admin-tutors',    icon:'ti-user-check',       label:'Tutors'},
    {id:'admin-approvals', icon:'ti-check',            label:'Approvals', badge: pendingRewards},
    {id:'admin-hours',     icon:'ti-clock',            label:'Hour reports'},
  ].map(function(i){
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+(i.badge?'<span class="nav-badge">'+i.badge+'</span>':'')+'</div>';
  }).join('');
}

function renderAdminDashboard() {
  if (isLoading('admin-dashboard')) return renderShell(adminNav(), Spinner(), 'Command Center');
  var d        = State.liveData['admin-dashboard'] || {};
  var users    = d.users    || [];
  var sessions = d.sessions || [];
  var requests = d.rewardRequests || [];
  var pending  = users.filter(function(u){ return !u.is_approved; });
  var students = users.filter(function(u){ return u.role==='student' && u.is_approved; });
  var tutors   = users.filter(function(u){ return u.role==='tutor'   && u.is_approved; });

  var content = '<div class="page-header"><div><div class="page-title">Command center</div><div class="page-sub">Everything happening in your program</div></div></div>';

  content += '<div class="stat-grid mb-24">';
  content += '<div class="stat-card"><div class="stat-icon g"><i class="ti ti-users"></i></div><div class="stat-val">'+students.length+'</div><div class="stat-lbl">Active students</div></div>';
  content += '<div class="stat-card"><div class="stat-icon v"><i class="ti ti-user-check"></i></div><div class="stat-val">'+tutors.length+'</div><div class="stat-lbl">Active tutors</div></div>';
  content += '<div class="stat-card"><div class="stat-icon a"><i class="ti ti-hourglass"></i></div><div class="stat-val">'+pending.length+'</div><div class="stat-lbl">Pending approval</div></div>';
  content += '<div class="stat-card"><div class="stat-icon r"><i class="ti ti-calendar"></i></div><div class="stat-val">'+sessions.length+'</div><div class="stat-lbl">Upcoming sessions</div></div>';
  content += '</div>';

  // Pending approvals
  if (pending.length) {
    content += '<div class="card mb-24"><div class="card-title">Pending account approvals</div>';
    content += pending.map(function(u){
      return '<div class="alert-item" id="pending-'+u.id+'"><div style="flex-shrink:0">'+Avatar(u.full_name,'purple',40)+'</div><div style="flex:1"><div class="alert-title" style="display:flex;align-items:center;gap:8px">'+esc(u.full_name)+' — '+esc(u.role)+' '+PendingBadge()+'</div><div class="alert-body">'+esc(u.email)+' · Applied '+timeAgo(u.created_at)+'</div><div class="alert-actions"><button class="btn btn-success btn-sm" onclick="adminApproveUser(\''+u.id+'\',\'pending-'+u.id+'\')"><i class="ti ti-check"></i> Approve</button><button class="btn btn-danger btn-sm" onclick="adminDenyUser(\''+u.id+'\',\'pending-'+u.id+'\')"><i class="ti ti-x"></i> Decline</button></div></div></div>';
    }).join('');
    content += '</div>';
  }

  // Upcoming sessions
  content += '<div class="grid-2">';
  content += '<div class="card"><div class="card-title">Upcoming sessions</div>';
  if (sessions.length) {
    content += sessions.slice(0,5).map(function(s){
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-2)"><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-1)">Session</div><div style="font-size:11px;color:var(--text-3)">'+formatDate(s.scheduled_at)+' · '+formatTime(s.scheduled_at)+'</div></div>'+StatusBadge(s.status)+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-calendar','No upcoming sessions.');
  }
  content += '</div>';

  // Pending rewards
  content += '<div class="card"><div class="card-title">Pending reward requests</div>';
  if (requests.length) {
    content += requests.slice(0,4).map(function(r){
      var sName = (r.students && r.students.users && r.students.users.full_name) || 'Student';
      var rName = (r.rewards && r.rewards.name) || 'Reward';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-2)">'+Avatar(sName,'purple',30)+'<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+esc(sName)+'</div><div style="font-size:11px;color:var(--text-3)">'+esc(rName)+' · '+r.cost_points+' pts</div></div><div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" onclick="adminResolveReward(\''+r.id+'\',true)"><i class="ti ti-check"></i></button><button class="btn btn-danger btn-sm" onclick="adminResolveReward(\''+r.id+'\',false)"><i class="ti ti-x"></i></button></div></div>';
    }).join('');
    content += '<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="navigate(\'admin-approvals\')">View all →</button>';
  } else {
    content += EmptyState('ti-check','No pending reward requests.');
  }
  content += '</div></div>';

  return renderShell(adminNav(), content, 'Command Center');
}

function adminApproveUser(userId, elId) {
  DB.approveUser(userId).then(function(r) {
    if (r && r.error) { toast('Error approving user.','error'); return; }
    var el = document.getElementById(elId);
    if (el) el.remove();
    toast('Account approved.','success');
    bustCache('admin');
    loadPageData('admin-dashboard');
  });
}

function adminDenyUser(userId, elId) {
  if (!confirm('Decline and delete this account request?')) return;
  DB.denyUser(userId).then(function(r) {
    if (r && r.error) { toast('Error declining user.','error'); return; }
    var el = document.getElementById(elId);
    if (el) el.remove();
    toast('Account declined.','info');
    bustCache('admin');
    loadPageData('admin-dashboard');
  });
}

function adminResolveReward(requestId, approved) {
  var uid = State.user && State.user.id;
  DB.resolveReward(requestId, approved, uid).then(function(r) {
    if (r && r.error) { toast('Error updating request.','error'); return; }
    toast(approved ? 'Reward approved.' : 'Reward denied.', approved ? 'success' : 'info');
    bustCache('admin');
    loadPageData('admin-dashboard');
    loadPageData('admin-approvals');
  });
}

function renderAdminStudents() {
  if (isLoading('admin-students')) return renderShell(adminNav(), Spinner(), 'Students');
  var d    = State.liveData['admin-students'] || {};
  var users = (d.users||[]).filter(function(u){ return u.role==='student'; });
  var content = '<div class="page-header"><div><div class="page-title">Students</div><div class="page-sub">'+users.filter(function(u){return u.is_approved;}).length+' active students</div></div></div>';
  content += '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead><tbody>';
  if (users.length) {
    content += users.map(function(u){
      return '<tr><td class="table-name">'+Avatar(u.full_name,'purple',30)+'<div><div style="font-size:13px;font-weight:600">'+esc(u.full_name)+'</div></div></td><td style="font-size:12px;color:var(--text-2)">'+esc(u.email)+'</td><td>'+(u.is_approved?Badge('Active','g'):PendingBadge())+'</td><td style="font-size:12px;color:var(--text-3)">'+formatDate(u.created_at)+'</td></tr>';
    }).join('');
  } else {
    content += '<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:32px">No students yet.</td></tr>';
  }
  content += '</tbody></table></div></div>';
  return renderShell(adminNav(), content, 'Students');
}

function renderAdminTutors() {
  if (isLoading('admin-tutors')) return renderShell(adminNav(), Spinner(), 'Tutors');
  var d     = State.liveData['admin-tutors'] || {};
  var users = (d.users||[]).filter(function(u){ return u.role==='tutor'; });
  var content = '<div class="page-header"><div><div class="page-title">Tutors</div><div class="page-sub">'+users.filter(function(u){return u.is_approved;}).length+' active tutors</div></div></div>';
  content += '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead><tbody>';
  if (users.length) {
    content += users.map(function(u){
      return '<tr><td class="table-name">'+Avatar(u.full_name,'green',30)+'<div><div style="font-size:13px;font-weight:600">'+esc(u.full_name)+'</div></div></td><td style="font-size:12px;color:var(--text-2)">'+esc(u.email)+'</td><td>'+(u.is_approved?Badge('Active','g'):PendingBadge())+'</td><td style="font-size:12px;color:var(--text-3)">'+formatDate(u.created_at)+'</td></tr>';
    }).join('');
  } else {
    content += '<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:32px">No tutors yet.</td></tr>';
  }
  content += '</tbody></table></div></div>';
  return renderShell(adminNav(), content, 'Tutors');
}

function renderAdminApprovals() {
  if (isLoading('admin-approvals')) return renderShell(adminNav(), Spinner(), 'Approvals');
  var d = State.liveData['admin-approvals'] || {};
  var requests = d.rewardRequests || [];
  var content = '<div class="page-header"><div><div class="page-title">Reward approvals</div><div class="page-sub">'+requests.length+' pending</div></div></div>';
  content += '<div class="card">';
  if (requests.length) {
    content += requests.map(function(r){
      var sName = (r.students && r.students.users && r.students.users.full_name) || 'Student';
      var rName = (r.rewards && r.rewards.name) || 'Reward';
      var bal   = (r.students && r.students.points_balance) || 0;
      return '<div class="approval-card" id="ar-'+r.id+'">'+Avatar(sName,'purple',40)+'<div class="approval-info"><div class="approval-name">'+esc(sName)+' — '+esc(rName)+'</div><div class="approval-meta">Balance: '+bal+' pts · Costs: '+r.cost_points+' pts · Remaining: '+(bal-r.cost_points)+' pts · '+timeAgo(r.created_at)+'</div></div><div class="approval-cost">'+r.cost_points+' pts</div><div class="approval-actions"><button class="btn btn-success" onclick="adminResolveReward(\''+r.id+'\',true)"><i class="ti ti-check"></i> Approve</button><button class="btn btn-danger" onclick="adminResolveReward(\''+r.id+'\',false)"><i class="ti ti-x"></i> Deny</button></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-check','No pending reward requests.');
  }
  content += '</div>';
  return renderShell(adminNav(), content, 'Approvals');
}

function renderAdminHours() {
  if (isLoading('admin-hours')) return renderShell(adminNav(), Spinner(), 'Hour Reports');
  var d    = State.liveData['admin-hours'] || {};
  var hrs  = d.tutorHours || [];
  // Group by tutor
  var byTutor = {};
  hrs.forEach(function(h){
    var tid  = h.tutor_id;
    var name = (h.tutors && h.tutors.users && h.tutors.users.full_name) || 'Tutor';
    if (!byTutor[tid]) byTutor[tid] = { name: name, total: 0 };
    byTutor[tid].total += parseFloat(h.hours_logged)||0;
  });
  var tutorList = Object.values(byTutor);
  var totalHrs  = tutorList.reduce(function(acc,t){ return acc + t.total; }, 0).toFixed(1);

  var content = '<div class="page-header"><div><div class="page-title">Hour reports</div><div class="page-sub">Volunteer hour tracking for grant reporting</div></div><button class="btn btn-primary" onclick="exportTutorHoursCSV()"><i class="ti ti-download"></i> Export CSV</button></div>';
  content += '<div class="stat-grid mb-24"><div class="stat-card"><div class="stat-icon g"><i class="ti ti-clock"></i></div><div class="stat-val">'+totalHrs+'h</div><div class="stat-lbl">Total hours</div></div><div class="stat-card"><div class="stat-icon v"><i class="ti ti-user-check"></i></div><div class="stat-val">'+tutorList.length+'</div><div class="stat-lbl">Tutors</div></div></div>';
  content += '<div class="card">';
  if (tutorList.length) {
    content += tutorList.map(function(t){
      return '<div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border-2)">'+Avatar(t.name,'green',40)+'<div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">'+esc(t.name)+'</div><div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:'+(totalHrs>0?(t.total/parseFloat(totalHrs)*100).toFixed(0):0)+'%"></div></div></div><div style="text-align:center;min-width:60px"><div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--accent)">'+t.total.toFixed(1)+'h</div></div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-clock','No hours logged yet.');
  }
  content += '</div>';
  return renderShell(adminNav(), content, 'Hour Reports');
}

function exportTutorHoursCSV() {
  var d   = State.liveData['admin-hours'] || {};
  var hrs = d.tutorHours || [];
  if (!hrs.length) { toast('No hours data to export.', 'info'); return; }
  var rows = [['Tutor Name', 'Date', 'Hours Logged']];
  hrs.forEach(function(h) {
    var name = (h.tutors && h.tutors.users && h.tutors.users.full_name) || 'Tutor';
    rows.push([name, h.session_date || '', h.hours_logged || 0]);
  });
  var csv = rows.map(function(r){
    return r.map(function(c){ return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'nukhba-tutor-hours.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Hours exported as CSV.', 'success');
}

/* ============================================
   LEGAL PAGES
   ============================================ */
function renderTerms() {
  var nav = '<nav class="nav"><div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div></div></div><button class="btn btn-ghost" onclick="navigate(\'landing\')">Back to home</button></nav>';
  var footer = '<footer class="site-footer"><div class="footer-copy">© 2026 Nukhba Tutoring Platform.</div><div class="footer-links"><span class="footer-link" onclick="navigate(\'terms\')">Terms of Use</span><span class="footer-link" onclick="navigate(\'privacy\')">Privacy Policy</span><a class="footer-link" href="mailto:support@nukhba.org">Support</a></div></footer>';
  return '<div style="min-height:100vh;background:var(--bg)">'+nav+'<div class="legal-page"><h1>Terms of Use</h1><div class="legal-date">Last updated: June 2026</div><p>Please read these Terms of Use carefully before using the Nukhba tutoring platform. By accessing or using our platform, you agree to be bound by these terms.</p><div class="legal-divider"></div><h2>1. About the Platform</h2><p>Nukhba is a free, nonprofit tutoring platform that connects K–12 students with qualified tutors for educational support. The platform is operated on a volunteer and community basis with no commercial intent.</p><h2>2. Eligibility</h2><p>To use this platform you must be a K–12 student, the parent or guardian of a K–12 student, or a qualified tutor — and must be approved by a program administrator before gaining full access.</p><h2>3. User Accounts</h2><p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration. Accounts may be suspended or terminated for misuse.</p><h2>4. Acceptable Use</h2><p>You agree not to harass or harm any other user, share inappropriate content, misrepresent your identity, use the platform commercially, or attempt unauthorised access.</p><h2>5. Sessions and Communication</h2><p>All sessions take place through designated video platforms. Communications within the platform may be reviewed by administrators for safety and quality purposes.</p><h2>6. Privacy and Minors</h2><p>We take the privacy of minors seriously. Student data is never sold or shared with third parties. Refer to our Privacy Policy for full details.</p><h2>7. Disclaimers</h2><p>Nukhba provides this platform on an as-is basis and makes no guarantees regarding academic outcomes.</p><h2>8. Limitation of Liability</h2><p>To the fullest extent permitted by law, Nukhba and its administrators shall not be liable for any indirect or consequential damages.</p><h2>9. Changes</h2><p>We may update these Terms periodically. Continued use after changes constitutes acceptance.</p><h2>10. Contact</h2><p>Questions? Email <a href="mailto:support@nukhba.org">support@nukhba.org</a></p></div>'+footer+'</div>';
}

function renderPrivacy() {
  var nav = '<nav class="nav"><div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div></div></div><button class="btn btn-ghost" onclick="navigate(\'landing\')">Back to home</button></nav>';
  var footer = '<footer class="site-footer"><div class="footer-copy">© 2026 Nukhba Tutoring Platform.</div><div class="footer-links"><span class="footer-link" onclick="navigate(\'terms\')">Terms of Use</span><span class="footer-link" onclick="navigate(\'privacy\')">Privacy Policy</span><a class="footer-link" href="mailto:support@nukhba.org">Support</a></div></footer>';
  return '<div style="min-height:100vh;background:var(--bg)">'+nav+'<div class="legal-page"><h1>Privacy Policy</h1><div class="legal-date">Last updated: June 2026</div><p>Your privacy matters to us. This Policy explains what information we collect, how we use it, and how we protect it — particularly given that our platform serves minors.</p><div class="legal-divider"></div><h2>1. Information We Collect</h2><p>Account information (name, email, role), student profile data (grade, subject, learning style, goals), tutor profile data, session data, platform communications, and points records.</p><h2>2. How We Use It</h2><p>Exclusively to match students with tutors, track academic progress, send session reminders, administer the points system, maintain tutor hour records, and ensure user safety.</p><h2>3. Protection of Minors</h2><p>Parental consent is required for students. Student data is never shared publicly. Administrators monitor communications. Students only interact with vetted, approved tutors.</p><h2>4. Data Sharing</h2><p>We do not sell or share your data with advertisers. Data is shared only with administrators, parents regarding their child, service providers necessary to operate the platform, or when required by law.</p><h2>5. Security</h2><p>Data is stored using Supabase with enterprise-grade encryption and row-level security so users only access authorised data.</p><h2>6. Your Rights</h2><p>You may access, correct, or request deletion of your data by contacting support@nukhba.org.</p><h2>7. Cookies</h2><p>We use minimal session storage only. No advertising cookies or third-party tracking.</p><h2>8. Retention</h2><p>Data is retained while your account is active. Upon deletion, personal data is removed within 30 days.</p><h2>9. Contact</h2><p>Privacy questions: <a href="mailto:support@nukhba.org">support@nukhba.org</a></p></div>'+footer+'</div>';
}

/* ============================================
   RENDER ENGINE
   ============================================ */
function render() {
  var app = document.getElementById('app');
  if (!app) return;

  var pageMap = {
    'onboarding':         renderOnboarding,
    'landing':            renderLanding,
    'student-dashboard':  renderStudentDashboard,
    'student-sessions':   renderStudentSessions,
    'student-calendar':   renderStudentCalendar,
    'student-homework':   renderStudentHomework,
    'student-matches':    renderStudentMatches,
    'student-progress':   renderStudentProgress,
    'student-points':     renderStudentPoints,
    'student-messages':   renderStudentMessages,
    'tutor-dashboard':    renderTutorDashboard,
    'tutor-requests':     renderTutorRequests,
    'tutor-calendar':     renderTutorCalendar,
    'tutor-messages':     renderTutorMessages,
    'tutor-students':     renderTutorStudents,
    'tutor-notes':        renderTutorNotes,
    'tutor-hours':        renderTutorHours,
    'tutor-homework':     renderTutorHomework,
    'parent-dashboard':   renderParentDashboard,
    'parent-progress':    renderParentProgress,
    'parent-sessions':    renderParentSessions,
    'parent-messages':    renderParentMessages,
    'admin-dashboard':    renderAdminDashboard,
    'admin-students':     renderAdminStudents,
    'admin-tutors':       renderAdminTutors,
    'admin-approvals':    renderAdminApprovals,
    'admin-hours':        renderAdminHours,
    'terms':              renderTerms,
    'privacy':            renderPrivacy,
  };

  var fn = pageMap[State.page] || renderLanding;
  app.innerHTML = fn();

  // Inject login modal
  if (State.modal === 'login') {
    document.body.insertAdjacentHTML('beforeend', renderLoginModal());
    var closeBtn = document.getElementById('close-login-btn');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      closeModalById('login-modal');
    });
    // Focus email field
    setTimeout(function(){
      var emailField = document.getElementById('signin-email');
      if (emailField) emailField.focus();
    }, 80);
  }

  // Mobile menu
  var menuBtn = document.getElementById('menu-btn');
  if (menuBtn && window.innerWidth <= 900) menuBtn.style.display = 'flex';
}

/* ---- WORD ANIMATION ---- */
var wordPairs = [
  ['perfect','perfect'],
  ['ideal','ideal'],
  ['best','best'],
  ['right','right'],
];
var wordIdx = 0;

function startWordAnimation() {
  setInterval(function() {
    var w1 = document.getElementById('hero-word');
    var w2 = document.getElementById('hero-word-2');
    if (!w1 || !w2) return;
    wordIdx = (wordIdx + 1) % wordPairs.length;
    w1.style.transition = w2.style.transition = 'opacity .25s ease, transform .25s ease';
    w1.style.opacity = w2.style.opacity = '0';
    w1.style.transform = w2.style.transform = 'translateY(-8px)';
    setTimeout(function() {
      if (!document.getElementById('hero-word')) return;
      document.getElementById('hero-word').textContent   = wordPairs[wordIdx][0];
      document.getElementById('hero-word-2').textContent = wordPairs[wordIdx][1];
      var nw1 = document.getElementById('hero-word');
      var nw2 = document.getElementById('hero-word-2');
      nw1.style.transform = nw2.style.transform = 'translateY(8px)';
      setTimeout(function() {
        if (!document.getElementById('hero-word')) return;
        document.getElementById('hero-word').style.opacity    = '1';
        document.getElementById('hero-word').style.transform  = 'translateY(0)';
        document.getElementById('hero-word-2').style.opacity  = '1';
        document.getElementById('hero-word-2').style.transform= 'translateY(0)';
      }, 20);
    }, 260);
  }, 2500);
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', function() {
  render();
  startWordAnimation();
  document.addEventListener('click', function(e) {
    var sidebar = document.getElementById('sidebar');
    var menuBtn = document.getElementById('menu-btn');
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
