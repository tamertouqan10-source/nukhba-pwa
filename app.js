/* ============================================
   NUKHBA — PWA v2 — Real Data
   ============================================ */

/* ---- STATE ---- */
const State = {
  user:       null,
  page:       'landing',
  modal:      null,
  liveData:   {},          // Loaded from Supabase per page
  loading:    {},          // Per-page loading flags
  onboarding: { step: 1, data: {} },
  checklistChecked: new Set(),
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
  State.onboarding = { step: 1, data: {} };
  State.liveData = {};
  if (needsOnboarding && role !== 'admin') {
    State.page = 'onboarding';
  } else {
    State.page = role + '-dashboard';
  }
  render();
  if (!needsOnboarding) loadPageData(State.page);
}

/* ---- DATA LOADER ---- */
function loadPageData(page) {
  if (!State.user || !State.user.id) return;
  var uid  = State.user.id;
  var role = State.user.role;

  var loaders = {
    'student-dashboard': function() {
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-sessions': function() {
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-progress': function() {
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-points': function() {
      setLoading(page, true);
      DB.loadStudentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'student-messages': function() {
      setLoading(page, true);
      DB.loadMessages(uid).then(function(msgs) {
        State.liveData[page] = { messages: msgs };
        setLoading(page, false);
        if (State.page === page) render();
        Realtime.subscribeMessages(uid, function(msg) {
          State.liveData[page].messages.unshift(msg);
          if (State.page === page) render();
        });
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-dashboard': function() {
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-sessions': function() {
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-students': function() {
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'tutor-hours': function() {
      setLoading(page, true);
      DB.loadTutorDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-dashboard': function() {
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-dashboard': function() {
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-students': function() {
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-approvals': function() {
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-hours': function() {
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'admin-tutors': function() {
      setLoading(page, true);
      DB.loadAdminDashboard().then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-progress': function() {
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-sessions': function() {
      setLoading(page, true);
      DB.loadParentDashboard(uid).then(function(data) {
        State.liveData[page] = data;
        setLoading(page, false);
        if (State.page === page) render();
      }).catch(function(){ setLoading(page, false); });
    },
    'parent-messages': function() {
      setLoading(page, true);
      DB.loadMessages(uid).then(function(msgs) {
        State.liveData[page] = { messages: msgs };
        setLoading(page, false);
        if (State.page === page) render();
        Realtime.subscribeMessages(uid, function(msg) {
          State.liveData[page].messages.unshift(msg);
          if (State.page === page) render();
        });
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
    'pending':   Badge('Pending','a'),
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
  var u = State.user;
  var colorMap = { student:'purple', tutor:'green', parent:'amber', admin:'purple' };
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
    '<button class="btn btn-icon btn-secondary" onclick="toast(\'No new notifications\',\'info\')" title="Notifications"><i class="ti ti-bell"></i></button>' +
    '</div></div>' +
    '<div class="page">' + pageContent + '</div>' +
    '</div></div>';
}

/* ============================================
   ONBOARDING
   ============================================ */
var ONBOARDING_STEPS = {
  student: [
    { id:'grade', title:'What grade are you in?', sub:'This helps us match you with a tutor familiar with your curriculum.', type:'choice', choices:[{label:'Grade 1–3',value:'1'},{label:'Grade 4–6',value:'4'},{label:'Grade 7–8',value:'7'},{label:'Grade 9–10',value:'9'},{label:'Grade 11–12',value:'11'}] },
    { id:'subject', title:'What subject do you need help with?', sub:'Choose your primary focus area.', type:'choice', choices:[{label:'SAT / ACT Prep',value:'SAT/ACT'},{label:'Math',value:'Math'},{label:'Sciences',value:'Sciences'},{label:'English & Literature',value:'English'},{label:'Arabic Language',value:'Arabic'},{label:'French / Other Language',value:'Languages'}] },
    { id:'learning_style', title:'How do you learn best?', sub:'We use this to pair you with a tutor whose teaching style matches yours.', type:'choice', choices:[{label:'Visual — diagrams and examples',value:'visual'},{label:'Auditory — explanation and discussion',value:'auditory'},{label:'Hands-on — practice problems',value:'kinesthetic'}] },
    { id:'pace_preference', title:'What pace works best for you?', sub:'There is no wrong answer — this just helps your tutor plan sessions.', type:'choice', choices:[{label:'Slow — I need more time per concept',value:'slow'},{label:'Moderate — balanced with regular review',value:'moderate'},{label:'Fast — I pick things up quickly',value:'fast'}] },
    { id:'goal_description', title:'What is your goal?', sub:'Describe what you want to achieve. Be as specific as you like.', type:'text', placeholder:'e.g. Improve my SAT Math score to 680 before November' },
  ],
  tutor: [
    { id:'subjects', title:'Which subjects can you teach?', sub:'Select all that apply.', type:'multi', choices:[{label:'SAT / ACT Prep',value:'SAT/ACT'},{label:'Math',value:'Math'},{label:'Sciences',value:'Sciences'},{label:'English & Literature',value:'English'},{label:'Arabic Language',value:'Arabic'},{label:'French / Other Language',value:'Languages'}] },
    { id:'teaching_style', title:'How would you describe your teaching style?', sub:'This helps us match you with students who respond well to your approach.', type:'choice', choices:[{label:'Visual — diagrams and examples',value:'visual'},{label:'Socratic — guide students to discover answers',value:'auditory'},{label:'Structured — clear plan with practice',value:'kinesthetic'}] },
    { id:'pace', title:'At what pace do you typically teach?', sub:'Students will be matched with you based on their own pace preference.', type:'choice', choices:[{label:'Slow — thorough and deliberate',value:'slow'},{label:'Moderate — balanced and adaptive',value:'moderate'},{label:'Fast — efficient and challenge-driven',value:'fast'}] },
    { id:'bio', title:'Tell students about yourself', sub:'A short bio helps students and parents feel confident before the first session.', type:'text', placeholder:'e.g. I am a mathematics graduate with 3 years of tutoring experience...' },
  ],
  parent: [
    { id:'child_name', title:"What is your child's name?", sub:'We will use this to personalise your dashboard and progress reports.', type:'text', placeholder:'e.g. Lena' },
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
      _supabaseClient.from('students').insert([{
        id: uid,
        grade: parseInt(data.grade,10)||null,
        subject: data.subject||null,
        learning_style: data.learning_style||null,
        pace_preference: data.pace_preference||null,
        goal_description: Sanitize.text(data.goal_description||'','long'),
      }]).then(function(r){
        if (r.error) console.warn('[Onboarding]',r.error);
        else runMatchEngine(uid);
      });
    } else if (role === 'tutor') {
      _supabaseClient.from('tutors').insert([{
        id: uid,
        subjects: data.subjects||[],
        teaching_style: data.teaching_style||null,
        pace: data.pace||null,
        bio: Sanitize.text(data.bio||'','long'),
      }]).then(function(r){ if(r.error) console.warn('[Onboarding]',r.error); });
    }
  }
  State.user.onboarded = true;
  State.page = role + '-dashboard';
  toast('Profile saved. Welcome to Nukhba.','success');
  render();
  loadPageData(State.page);
}

function runMatchEngine(studentId) {
  if (!_supabaseClient || !studentId) return;
  var student;
  _supabaseClient.from('students')
    .select('subject, learning_style, pace_preference')
    .eq('id', studentId)
    .single()
    .then(function(sr) {
      if (sr.error || !sr.data) return null;
      student = sr.data;
      return _supabaseClient.from('tutors').select('id, subjects, teaching_style, pace');
    })
    .then(function(tr) {
      if (!tr || !student) return null;
      if (tr.error || !tr.data || !tr.data.length) return null;
      var scores = tr.data.map(function(t) {
        var styleScore   = student.learning_style === t.teaching_style ? 100 : 0;
        var paceScore    = student.pace_preference === t.pace ? 100 : 0;
        var subjectScore = Array.isArray(t.subjects) && t.subjects.indexOf(student.subject) !== -1 ? 100 : 0;
        var overall      = Math.round((styleScore + paceScore + subjectScore) / 3);
        return {
          student_id:    studentId,
          tutor_id:      t.id,
          style_score:   styleScore,
          pace_score:    paceScore,
          subject_score: subjectScore,
          overall_score: overall,
        };
      });
      return _supabaseClient.from('match_scores').upsert(scores, { onConflict: 'student_id,tutor_id' });
    })
    .then(function(mr) {
      if (!mr) return null;
      if (mr.error) { console.warn('[Match] Upsert error:', mr.error); return null; }
      return _supabaseClient.from('match_scores')
        .select('tutor_id, overall_score')
        .eq('student_id', studentId)
        .order('overall_score', { ascending: false })
        .limit(1)
        .single();
    })
    .then(function(best) {
      if (!best || best.error || !best.data) return;
      _supabaseClient.from('students')
        .update({ tutor_id: best.data.tutor_id })
        .eq('id', studentId)
        .then(function(r){ if (r.error) console.warn('[Match] tutor_id update error:', r.error); });
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
  } else if (step.type === 'text') {
    parts.push('<textarea id="onboarding-text" class="form-input" rows="4" placeholder="'+esc(step.placeholder)+'" maxlength="500" style="resize:none;line-height:1.6;font-size:14px" oninput="State.onboarding.data[\''+step.id+'\']=this.value">'+esc(data[step.id]||'')+'</textarea>');
  }
  parts.push('<div style="display:flex;gap:10px;margin-top:28px">');
  if (cur > 1) parts.push('<button class="btn btn-secondary" onclick="onboardingBack()" style="min-width:90px"><i class="ti ti-arrow-left"></i> Back</button>');
  if (step.type !== 'choice') {
    var isLast = cur === total;
    parts.push('<button class="btn btn-primary" onclick="onboardingNext()" style="flex:1;justify-content:center">'+(isLast?'Complete setup <i class="ti ti-check"></i>':'Continue <i class="ti ti-arrow-right"></i>')+'</button>');
  }
  parts.push('</div>');
  parts.push('<div style="text-align:center;margin-top:16px"><span style="font-size:12px;color:var(--text-3);cursor:pointer" onclick="onboardingSubmit()">Skip for now</span></div>');
  parts.push('</div></div>');
  return parts.join('');
}

/* ============================================
   STUDENT PORTAL
   ============================================ */
function studentNav() {
  return [
    {id:'student-dashboard',icon:'ti-layout-dashboard',label:'Dashboard'},
    {id:'student-sessions', icon:'ti-calendar',        label:'My sessions'},
    {id:'student-progress', icon:'ti-chart-line',      label:'Progress'},
    {id:'student-points',   icon:'ti-coins',           label:'Points & rewards'},
    {id:'student-messages', icon:'ti-message-2',       label:'Messages'},
  ].map(function(i){
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+'</div>';
  }).join('');
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
  content += '<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center"><div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-1)">'+sessions.filter(function(s){return s.status==='completed';}).length+'</div><div class="text-xs text-3">Sessions done</div></div>';
  content += '<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center"><div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--teal)">'+skills.filter(function(sk){return sk.status==='mastered';}).length+'</div><div class="text-xs text-3">Skills mastered</div></div>';
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
  var rewards = d.rewards || [];
  var balance = s.points_balance || 0;

  var content = '<div class="page-header"><div><div class="page-title">Points & rewards</div><div class="page-sub">Earn points for attendance and homework — spend them on rewards</div></div></div>';

  content += '<div class="xp-card mb-24"><div class="flex items-center justify-between"><div><div style="font-size:12px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Points balance</div><div class="xp-big">'+balance+'</div></div><div style="text-align:right"><div style="font-size:12px;color:var(--text-3);margin-bottom:8px">How to earn</div><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span style="font-size:12px;color:var(--text-2)">Attend session <span style="color:var(--teal);font-weight:600">+50</span></span><span style="font-size:12px;color:var(--text-2)">On time <span style="color:var(--teal);font-weight:600">+10</span></span><span style="font-size:12px;color:var(--text-2)">Homework on time <span style="color:var(--teal);font-weight:600">+30</span></span><span style="font-size:12px;color:var(--text-2)">Weekly streak <span style="color:var(--amber);font-weight:600">+10/wk</span></span></div></div></div></div>';

  if (rewards.length) {
    content += '<div class="card mb-24"><div class="flex items-center justify-between mb-16"><div class="card-title" style="margin-bottom:0">Rewards store</div><div class="text-sm text-3">All redemptions require teacher approval</div></div><div class="reward-grid">';
    content += rewards.map(function(r){
      var canAfford = balance >= r.cost_points;
      return '<div class="reward-card" style="'+(canAfford?'':'opacity:0.6')+'"><div class="reward-icon"><i class="ti ti-gift"></i></div><div class="reward-name">'+esc(r.name)+'</div><div class="reward-cost">'+r.cost_points+' pts</div><div class="reward-desc">'+esc(r.description||'')+'</div><button class="btn btn-secondary btn-sm" style="width:100%" '+(canAfford?'onclick="redeemReward(\''+r.id+'\','+r.cost_points+')"':'disabled title="Not enough points"')+'>'+(canAfford?'Redeem':'Need '+r.cost_points+' pts')+'</button></div>';
    }).join('');
    content += '</div></div>';
  }

  content += '<div class="card"><div class="card-title">Recent transactions</div>';
  if (txns.length) {
    content += txns.map(function(t){
      var plus = t.type === 'earn';
      return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-2)"><div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:'+(plus?'var(--teal-soft)':'var(--danger-soft)')+'"><i class="ti ti-'+(plus?'plus':'minus')+'" style="font-size:13px;color:'+(plus?'var(--teal)':'var(--danger)')+'"></i></div><div style="flex:1;font-size:13px;color:var(--text-1)">'+esc(t.reason||'Transaction')+'</div><div style="font-size:13px;font-weight:600;color:'+(plus?'var(--teal)':'var(--danger)')+'">'+  (plus?'+':'-')+t.amount+'</div></div>';
    }).join('');
  } else {
    content += EmptyState('ti-coins','No transactions yet. Attend sessions to start earning points.');
  }
  content += '</div>';
  return renderShell(studentNav(), content, 'Points & Rewards');
}

function redeemReward(rewardId, cost) {
  var uid = State.user && State.user.id;
  if (!uid) return;
  DB.requestReward(uid, rewardId, cost).then(function(r) {
    if (r && r.error) { toast('Could not submit request. Try again.','error'); return; }
    toast('Redemption request sent to your tutor for approval.','success');
  });
}

function markAndJoin(sessionId, btn) {
  var url = btn.getAttribute('data-url');
  if (!url) return;
  window.open(url, '_blank', 'noopener');
  DB.markStudentJoined(sessionId).catch(function(){});
}

function renderStudentMessages() {
  if (isLoading('student-messages')) return renderShell(studentNav(), Spinner(), 'Messages');
  var d    = State.liveData['student-messages'] || {};
  var msgs = d.messages || [];
  var content = '<div class="page-header"><div><div class="page-title">Messages</div><div class="page-sub">All conversations are logged for safety</div></div></div>';
  if (msgs.length) {
    content += '<div class="card">';
    content += msgs.map(function(m){
      var fromMe = m.sender_id === State.user.id;
      var name   = fromMe ? 'You' : (m.sender && m.sender.full_name ? esc(m.sender.full_name) : 'Unknown');
      return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+Avatar(name,'purple',32)+'<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+name+'</div><div style="font-size:11px;color:var(--text-3)">'+timeAgo(m.created_at)+'</div></div><div style="font-size:13px;color:var(--text-2)">'+esc(m.content)+'</div></div></div>';
    }).join('');
    content += '</div>';
  } else {
    content += '<div class="card">'+EmptyState('ti-message-2','No messages yet. Your tutor will reach out before your first session.')+'</div>';
  }
  return renderShell(studentNav(), content, 'Messages');
}

/* ============================================
   TUTOR PORTAL
   ============================================ */
function tutorNav() {
  return [
    {id:'tutor-dashboard', icon:'ti-layout-dashboard', label:'Dashboard'},
    {id:'tutor-sessions',  icon:'ti-calendar',         label:'Sessions'},
    {id:'tutor-students',  icon:'ti-users',            label:'My students'},
    {id:'tutor-notes',     icon:'ti-notes',            label:'Session notes'},
    {id:'tutor-hours',     icon:'ti-clock',            label:'Hour log'},
  ].map(function(i){
    return '<div class="nav-item'+(State.page===i.id?' active':'')+'" onclick="navigate(\''+i.id+'\')"><i class="ti '+i.icon+'"></i> '+i.label+'</div>';
  }).join('');
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

  return renderShell(tutorNav(), content, 'Dashboard');
}

function renderTutorSessions() {
  if (isLoading('tutor-sessions')) return renderShell(tutorNav(), Spinner(), 'Sessions');
  var d = State.liveData['tutor-sessions'] || {};
  var sessions = d.sessions || [];
  var content = '<div class="page-header"><div><div class="page-title">Sessions</div><div class="page-sub">All your scheduled and past sessions</div></div></div>';
  content += '<div class="card">';
  if (sessions.length) {
    content += sessions.map(function(s){
      return '<div class="session-card"><div class="session-time"><div class="session-time-val">'+formatTime(s.scheduled_at)+'</div><div class="session-time-day">'+formatDate(s.scheduled_at)+'</div></div><div class="session-body"><div class="session-student">Session</div><div class="session-meta"><i class="ti ti-clock"></i>'+(s.duration_minutes||60)+' min '+StatusBadge(s.status)+'</div></div>'+(s.meeting_link&&s.status==='upcoming'?'<a class="btn btn-primary btn-sm" href="'+esc(s.meeting_link)+'" target="_blank" rel="noopener"><i class="ti ti-video"></i> Join</a>':'')+'</div>';
    }).join('');
  } else {
    content += EmptyState('ti-calendar','No sessions yet.');
  }
  content += '</div>';
  return renderShell(tutorNav(), content, 'Sessions');
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
  var content = '<div class="page-header"><div><div class="page-title">Session notes</div><div class="page-sub">Complete the checklist — AI drafts the note for you</div></div></div>';
  content += '<div class="grid-2">';
  content += '<div>';
  content += '<div class="card mb-16"><div class="card-title">Session details</div>';
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
  content += '<div class="input-group"><label class="input-label">Homework assigned</label><input class="input" id="note-hw" placeholder="e.g. 10 quadratic practice problems" maxlength="300" /></div></div>';
  content += '<button class="btn btn-primary" style="width:100%" onclick="generateNote()"><i class="ti ti-sparkles"></i> Generate session note</button>';
  content += '</div>';
  content += '<div class="card" id="note-output"><div class="card-title">Drafted note</div>'+EmptyState('ti-file-text','Complete the checklist and click Generate — your session note will appear here.')+'</div>';
  content += '</div>';
  return renderShell(tutorNav(), content, 'Session Notes');
}

function generateNote() {
  var flag = (document.getElementById('note-flag')||{}).value||'';
  var hw   = (document.getElementById('note-hw')||{}).value||'';
  var date = (document.getElementById('note-date')||{}).value||new Date().toLocaleDateString();
  var noteEl = document.getElementById('note-output');
  if (!noteEl) return;
  var checked = Array.from(State.checklistChecked).map(function(i){ return CHECKLIST_TOPICS[i]; });
  noteEl.innerHTML = '<div class="card-title" style="display:flex;justify-content:space-between;align-items:center">Drafted note<span style="font-size:11px;color:var(--teal);display:flex;align-items:center;gap:4px"><i class="ti ti-check-circle"></i> Ready to review</span></div>';
  noteEl.innerHTML += '<div style="font-size:13px;line-height:1.8;color:var(--text-2);background:var(--surface-2);border-radius:var(--radius-md);padding:16px;margin-bottom:14px"><strong style="color:var(--text-1)">Session — '+esc(date)+'</strong><br><br>';
  if (checked.length) noteEl.innerHTML += 'Topics covered this session: '+esc(checked.join(', '))+'.<br><br>';
  if (flag)           noteEl.innerHTML += '<strong style="color:var(--amber)">Flag for next session:</strong> '+esc(flag)+'<br>';
  if (hw)             noteEl.innerHTML += '<strong style="color:var(--text-1)">Homework assigned:</strong> '+esc(hw);
  noteEl.innerHTML += '</div>';
  noteEl.innerHTML += '<div style="display:flex;gap:8px"><button class="btn btn-success" style="flex:1" onclick="toast(\'Note approved and saved.\',\'success\')"><i class="ti ti-check"></i> Approve & save</button><button class="btn btn-secondary" onclick="toast(\'Edit directly in the text area\',\'info\')"><i class="ti ti-edit"></i> Edit</button></div>';
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
  var d    = State.liveData['parent-messages'] || {};
  var msgs = d.messages || [];
  var content = '<div class="page-header"><div><div class="page-title">Messages</div><div class="page-sub">Messages with your child\'s tutor</div></div></div>';
  if (msgs.length) {
    content += '<div class="card">';
    content += msgs.map(function(m){
      var fromMe = m.sender_id === State.user.id;
      var name   = fromMe ? 'You' : (m.sender && m.sender.full_name ? esc(m.sender.full_name) : 'Unknown');
      return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-2)">'+Avatar(name,'amber',32)+'<div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:13px;font-weight:600;color:var(--text-1)">'+name+'</div><div style="font-size:11px;color:var(--text-3)">'+timeAgo(m.created_at)+'</div></div><div style="font-size:13px;color:var(--text-2)">'+esc(m.content)+'</div></div></div>';
    }).join('');
    content += '</div>';
  } else {
    content += '<div class="card">'+EmptyState('ti-message-2','No messages yet. Your child\'s tutor will reach out with updates.')+'</div>';
  }
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
  content += '<div class="stat-card"><div class="stat-icon a"><i class="ti ti-user-clock"></i></div><div class="stat-val">'+pending.length+'</div><div class="stat-lbl">Pending approval</div></div>';
  content += '<div class="stat-card"><div class="stat-icon r"><i class="ti ti-calendar"></i></div><div class="stat-val">'+sessions.length+'</div><div class="stat-lbl">Upcoming sessions</div></div>';
  content += '</div>';

  // Pending approvals
  if (pending.length) {
    content += '<div class="card mb-24"><div class="card-title">Pending account approvals</div>';
    content += pending.map(function(u){
      return '<div class="alert-item" id="pending-'+u.id+'"><div style="flex-shrink:0">'+Avatar(u.full_name,'purple',40)+'</div><div style="flex:1"><div class="alert-title">'+esc(u.full_name)+' — '+esc(u.role)+'</div><div class="alert-body">'+esc(u.email)+' · Applied '+timeAgo(u.created_at)+'</div><div class="alert-actions"><button class="btn btn-success btn-sm" onclick="adminApproveUser(\''+u.id+'\',\'pending-'+u.id+'\')"><i class="ti ti-check"></i> Approve</button><button class="btn btn-danger btn-sm" onclick="adminDenyUser(\''+u.id+'\',\'pending-'+u.id+'\')"><i class="ti ti-x"></i> Decline</button></div></div></div>';
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
    // Refresh admin data
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
  });
}

function adminResolveReward(requestId, approved) {
  var uid = State.user && State.user.id;
  DB.resolveReward(requestId, approved, uid).then(function(r) {
    if (r && r.error) { toast('Error updating request.','error'); return; }
    toast(approved ? 'Reward approved.' : 'Reward denied.', approved ? 'success' : 'info');
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
      return '<tr><td class="table-name">'+Avatar(u.full_name,'purple',30)+'<div><div style="font-size:13px;font-weight:600">'+esc(u.full_name)+'</div></div></td><td style="font-size:12px;color:var(--text-2)">'+esc(u.email)+'</td><td>'+(u.is_approved?Badge('Active','g'):Badge('Pending','a'))+'</td><td style="font-size:12px;color:var(--text-3)">'+formatDate(u.created_at)+'</td></tr>';
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
      return '<tr><td class="table-name">'+Avatar(u.full_name,'green',30)+'<div><div style="font-size:13px;font-weight:600">'+esc(u.full_name)+'</div></div></td><td style="font-size:12px;color:var(--text-2)">'+esc(u.email)+'</td><td>'+(u.is_approved?Badge('Active','g'):Badge('Pending','a'))+'</td><td style="font-size:12px;color:var(--text-3)">'+formatDate(u.created_at)+'</td></tr>';
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
    'student-progress':   renderStudentProgress,
    'student-points':     renderStudentPoints,
    'student-messages':   renderStudentMessages,
    'tutor-dashboard':    renderTutorDashboard,
    'tutor-sessions':     renderTutorSessions,
    'tutor-students':     renderTutorStudents,
    'tutor-notes':        renderTutorNotes,
    'tutor-hours':        renderTutorHours,
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
