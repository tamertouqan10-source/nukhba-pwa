/* ============================================
   NUKHBA — PWA App
   ============================================ */

// ---- STATE ----
const State = {
  user: null,
  page: 'landing',
  modal: null,
  checklistChecked: new Set(),
  activeTab: {},
};


function closeModalById(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
  if (id === 'login-modal') State.modal = null;
}
// ---- ROUTER ----
function navigate(page) {
  State.page = page;
  render();
  window.scrollTo(0, 0);
}

function openModal(name) {
  State.modal = name;
  render();
}

function closeModal() {
  State.modal = null;
  render();
}


function openHowItWorks() {
  document.getElementById('login-modal') && document.getElementById('login-modal').remove();
  document.getElementById('how-modal') && document.getElementById('how-modal').remove();
  const parts = [];
  parts.push('<div class="modal-overlay" id="how-modal" onclick="closeModalById(\'how-modal\')" style="z-index:200">');
  parts.push('<div class="modal" style="max-width:500px">');
  parts.push('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">');
  parts.push('<div style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--text-1)">How Nukhba works</div>');
  parts.push('<button onclick="closeModalById(\'how-modal\')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px"><i class="ti ti-x"></i></button>');
  parts.push('</div>');

  const steps = [
    ['ti-brain','var(--accent)','var(--accent-soft)','01','Smart matching','Every student takes a 5-minute quiz. Our algorithm pairs them with a tutor by learning style, pace, subject, and personality.'],
    ['ti-calendar-check','var(--teal)','var(--teal-soft)','02','Weekly sessions','Students book sessions in the app, get automatic meeting links, and receive smart reminders.'],
    ['ti-chart-line','var(--amber)','var(--amber-soft)','03','Progress tracked','AI drafts session notes from the tutor checklist. Parents see the skill map update in real time after every session.'],
    ['ti-award','var(--steel)','var(--steel-soft)','04','Points for effort','Students earn points for attendance and homework. Spend them on real rewards — all teacher-approved.']
  ];

  steps.forEach(function(s, i) {
    const border = i < steps.length - 1 ? 'border-bottom:1px solid var(--border-2);' : '';
    parts.push('<div style="display:flex;gap:14px;padding:14px 0;' + border + '">');
    parts.push('<div style="width:38px;height:38px;border-radius:10px;background:' + s[2] + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ' + s[0] + '" style="font-size:17px;color:' + s[1] + '"></i></div>');
    parts.push('<div><div style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Step ' + s[3] + '</div>');
    parts.push('<div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">' + s[4] + '</div>');
    parts.push('<div style="font-size:12px;color:var(--text-2);line-height:1.6">' + s[5] + '</div></div></div>');
  });

  parts.push('<button onclick="closeModalById(\'how-modal\');openModal(\'login\')" style="width:100%;margin-top:18px;padding:12px;background:var(--accent);color:#FAF8F5;border:none;border-radius:var(--r-md);font-size:14px;font-weight:500;cursor:pointer;">Join the program</button>');
  parts.push('</div></div>');
  document.body.insertAdjacentHTML('beforeend', parts.join(''));
}

function setUser(role, name) {
  State.user = { role, name };
  State.modal = null;
  State.page = role + '-dashboard';
  render();
}

// ---- TOAST ----
function toast(msg, type = 'success') {
  const icons = { success: 'ti-circle-check', error: 'ti-alert-circle', info: 'ti-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="ti ${icons[type]}"></i><span>${msg}</span>`;
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---- TAB SYSTEM ----
function setTab(group, id) {
  State.activeTab[group] = id;
  document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(el => {
    el.classList.toggle('active', el.dataset.tabId === id);
  });
  document.querySelectorAll(`[data-panel-group="${group}"]`).forEach(el => {
    el.classList.toggle('active', el.dataset.panelId === id);
  });
}

// ---- CHECKLIST ----
function toggleCheck(id) {
  if (State.checklistChecked.has(id)) State.checklistChecked.delete(id);
  else State.checklistChecked.add(id);
  const item = document.querySelector(`[data-check="${id}"]`);
  if (item) {
    item.classList.toggle('checked', State.checklistChecked.has(id));
    item.querySelector('.checklist-cb').innerHTML = State.checklistChecked.has(id)
      ? '<i class="ti ti-check"></i>' : '';
  }
}

// ---- DATA ----
const DATA = {
  students: [
    { id: 1, name: 'Lena M.', grade: 8, subject: 'SAT Math', tutor: 'Ahmed H.', sessions: 12, hours: 18, goal: 67, status: 'on-track', initials: 'LM', color: 'purple' },
    { id: 2, name: 'Omar B.', grade: 10, subject: 'Literature', tutor: 'Sara K.', sessions: 8, hours: 12, goal: 54, status: 'on-track', initials: 'OB', color: 'amber' },
    { id: 3, name: 'Yara S.', grade: 6, subject: 'Math basics', tutor: 'Ahmed H.', sessions: 5, hours: 7.5, goal: 28, status: 'attention', initials: 'YS', color: 'green' },
    { id: 4, name: 'Amir K.', grade: 9, subject: 'SAT Math', tutor: 'Sara K.', sessions: 14, hours: 21, goal: 80, status: 'on-track', initials: 'AK', color: 'purple' },
  ],
  tutors: [
    { id: 1, name: 'Ahmed H.', subjects: ['SAT Math', 'Math basics'], students: 2, monthHours: 24, totalHours: 96, sessions: 18, initials: 'AH', color: 'green' },
    { id: 2, name: 'Sara K.', subjects: ['Literature', 'SAT Math'], students: 2, monthHours: 16, totalHours: 64, sessions: 12, initials: 'SK', color: 'purple' },
  ],
  skills: [
    { name: 'Linear equations', pct: 95, status: 'mastered' },
    { name: 'Systems of equations', pct: 82, status: 'mastered' },
    { name: 'Quadratic functions', pct: 64, status: 'progress' },
    { name: 'Data analysis & statistics', pct: 48, status: 'progress' },
    { name: 'Trigonometry', pct: 12, status: 'not-started' },
  ],
  rewards: [
    { id: 1, icon: '⭐', name: 'Extra credit', cost: 300, desc: '+5 points on next graded assignment' },
    { id: 2, icon: '📋', name: 'Homework pass', cost: 250, desc: 'Skip one homework assignment' },
    { id: 3, icon: '⏰', name: 'Deadline extension', cost: 200, desc: '48-hour extension on one assignment' },
    { id: 4, icon: '🔁', name: 'Quiz retake', cost: 400, desc: 'Retake one quiz for a better grade' },
    { id: 5, icon: '🎯', name: 'Choose topic', cost: 150, desc: 'Pick next session\'s focus topic' },
    { id: 6, icon: '🏆', name: 'Certificate', cost: 500, desc: 'Official certificate of excellence' },
  ],
  approvals: [
    { id: 1, student: 'Lena M.', initials: 'LM', reward: 'Extra credit', cost: 300, balance: 1240, time: '2 hours ago', tutor: 'Ahmed H.' },
    { id: 2, student: 'Omar B.', initials: 'OB', reward: 'Homework pass', cost: 250, balance: 720, time: 'Yesterday', tutor: 'Sara K.' },
    { id: 3, student: 'Yara S.', initials: 'YS', reward: 'Deadline extension', cost: 200, balance: 450, time: '3 days ago', tutor: 'Ahmed H.' },
  ],
  sessions: [
    { id: 1, student: 'Lena M.', initials: 'LM', subject: 'SAT Math', time: '4:00 PM', day: 'Tomorrow', duration: '60 min', risk: 18, status: 'confirmed' },
    { id: 2, student: 'Yara S.', initials: 'YS', subject: 'Math basics', time: '5:30 PM', day: 'Jun 14', duration: '45 min', risk: 72, status: 'at-risk' },
    { id: 3, student: 'Omar B.', initials: 'OB', subject: 'Literature', time: '6:00 PM', day: 'Jun 16', duration: '60 min', risk: 35, status: 'confirmed' },
  ],
  checklistTopics: [
    'Covered main topic',
    'Reviewed previous homework',
    'Identified gaps or struggles',
    'Assigned new homework',
    'Set focus for next session',
  ],
};

// ---- COMPONENTS ----

function Avatar(initials, color = 'purple', size = 34) {
  const colors = {
    purple: 'background:var(--accent-soft);color:var(--accent)',
    green:  'background:var(--teal-soft);color:var(--teal)',
    amber:  'background:var(--amber-soft);color:var(--amber)',
    red:    'background:var(--danger-soft);color:var(--danger)',
  };
  return `<div class="user-av ${color}" style="width:${size}px;height:${size}px;font-size:${Math.floor(size*0.35)}px;${colors[color]||colors.purple}">${initials}</div>`;
}

function Badge(text, type = 'v') {
  return `<span class="badge badge-${type}">${text}</span>`;
}

function ProgressBar(pct, type = 'accent', height = 6) {
  const color = { accent: 'accent', mastered: 'teal', progress: 'amber', 'not-started': 'danger', grad: 'grad' };
  const fill = pct > 75 ? 'teal' : pct > 40 ? 'amber' : 'danger';
  return `<div class="progress-wrap" style="height:${height}px"><div class="progress-fill ${color[type] || fill}" style="width:${pct}%"></div></div>`;
}

function StatusBadge(status) {
  const map = {
    'on-track':  [Badge('On track', 'g')],
    'attention': [Badge('Needs attention', 'a')],
    'stalled':   [Badge('Stalled', 'r')],
    'confirmed': [Badge('Confirmed', 'g')],
    'at-risk':   [Badge('At risk', 'r')],
    'pending':   [Badge('Pending', 'a')],
  };
  return (map[status] || [Badge(status, 'gray')])[0];
}

// ---- PAGES ----

function renderLanding() {
  const parts = [];
  parts.push('<div class="landing">');
  // Gradient mesh — 5 blobs with moveVertical/moveInCircle/moveHorizontal
  parts.push('<div class="gradient-bg">');
  parts.push('<div class="g-blob g-1"></div>');
  parts.push('<div class="g-blob g-2"></div>');
  parts.push('<div class="g-blob g-3"></div>');
  parts.push('<div class="g-blob g-4"></div>');
  parts.push('<div class="g-blob g-5"></div>');
  parts.push('</div>');

  // NAV
  parts.push('<nav class="nav">');
  parts.push('<div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div><div class="nav-logo-sub">Tutoring Platform</div></div></div>');
  parts.push('<div class="nav-actions">');
  parts.push('<button class="btn btn-ghost" onclick="openModal(&quot;login&quot;)">Sign in</button>');
  parts.push('</div></nav>');

  // HERO — SPLIT LAYOUT
  parts.push('<section class="hero">');

  // LEFT
  parts.push('<div class="hero-left">');
  parts.push('<div class="hero-eyebrow"><div class="hero-eyebrow-dot"></div>Free — Nonprofit — K–12</div>');
  parts.push('<h1 class="hero-title">Where the <span id="hero-word" class="hero-word-anim" style="display:inline-block;min-width:3.5ch">right</span> tutor<br>meets the <span id="hero-word-2" class="hero-word-anim" style="display:inline-block;min-width:5.5ch">right</span> student</h1>');
  parts.push('<p class="hero-sub">A thoughtfully designed tutoring platform that matches students with tutors by personality and learning style, tracks real academic progress, and keeps everyone motivated.</p>');
  parts.push('<div class="hero-cta">');
  parts.push('<button class="btn btn-primary btn-lg" onclick="openModal(&quot;login&quot;)">Join the program</button>');
  parts.push('<button class="btn btn-secondary btn-lg" onclick="openHowItWorks()">See how it works</button>');
  parts.push('</div>');
  parts.push('<div class="hero-stats">');
  parts.push('<div><div class="hero-stat-val">100%</div><div class="hero-stat-lbl">Free forever</div></div>');
  parts.push('<div><div class="hero-stat-val">K–12</div><div class="hero-stat-lbl">All grades</div></div>');
  parts.push('<div><div class="hero-stat-val">3+</div><div class="hero-stat-lbl">Subjects</div></div>');
  parts.push('</div>');
  parts.push('</div>');

  // RIGHT — week in review widget
  parts.push('<div class="hero-right">');
  parts.push('<div class="hero-card" style="padding:0;overflow:hidden;min-width:340px">');

  // Header bar
  parts.push('<div style="padding:18px 20px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(220,214,206,0.6)">');
  parts.push('<div style="font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text-1)">This week</div>');
  parts.push('<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">June 2026</div>');
  parts.push('</div>');

  // Week day strip
  parts.push('<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:14px 16px;background:var(--surface-2)">');
  var days = [['M',true,50],['T',false,0],['W',true,80],['T',false,0],['F',true,60],['S',false,0],['S',false,0]];
  days.forEach(function(d) {
    var bg = d[1] ? 'var(--accent)' : 'rgba(0,0,0,0.04)';
    var fg = d[1] ? '#FAF8F5' : 'var(--text-3)';
    parts.push('<div style="display:flex;flex-direction:column;align-items:center;gap:4px">');
    parts.push('<div style="font-size:9px;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em">' + d[0] + '</div>');
    parts.push('<div style="width:32px;height:32px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + fg + '">' + (d[1] ? '<i class="ti ti-check" style="font-size:13px"></i>' : '') + '</div>');
    if(d[1]) parts.push('<div style="font-size:9px;color:var(--accent);font-weight:500">+' + d[2] + '</div>');
    else parts.push('<div style="font-size:9px;color:transparent">0</div>');
    parts.push('</div>');
  });
  parts.push('</div>');

  // Points this week
  parts.push('<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid rgba(220,214,206,0.5)">');
  parts.push('<div style="padding:14px 18px;border-right:1px solid rgba(220,214,206,0.5)">');
  parts.push('<div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Points earned</div>');
  parts.push('<div style="font-family:var(--font-display);font-size:28px;font-weight:600;color:var(--accent)">190</div>');
  parts.push('<div style="font-size:11px;color:var(--teal);margin-top:2px">+40 from streak</div>');
  parts.push('</div>');
  parts.push('<div style="padding:14px 18px">');
  parts.push('<div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Streak</div>');
  parts.push('<div style="font-family:var(--font-display);font-size:28px;font-weight:600;color:var(--amber)">7</div>');
  parts.push('<div style="font-size:11px;color:var(--text-3);margin-top:2px">weeks running</div>');
  parts.push('</div>');
  parts.push('</div>');

  // Tutor message preview
  parts.push('<div style="padding:14px 18px;display:flex;align-items:flex-start;gap:10px">');
  parts.push('<div style="width:34px;height:34px;border-radius:50%;background:var(--teal-soft);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--teal);flex-shrink:0">A</div>');
  parts.push('<div style="flex:1;background:var(--surface-2);border-radius:0 var(--r-md) var(--r-md) var(--r-md);padding:10px 12px">');
  parts.push('<div style="font-size:11px;font-weight:600;color:var(--text-1);margin-bottom:3px">Ahmed H.</div>');
  parts.push('<div style="font-size:12px;color:var(--text-2);line-height:1.5">Great work this week. Review quadratic functions before Thursday — you&#39;re closer than you think.</div>');
  parts.push('</div>');
  parts.push('</div>');

  parts.push('</div></div>');
  parts.push('</section>');
  parts.push('</section>');
  parts.push('<div class="how-grid">');

  const steps = [
    ['01','Smart matching','Every student takes a short intake quiz. Our algorithm pairs them with the tutor whose teaching style, pace, and personality best complements theirs.'],
    ['02','Weekly sessions','Students book their weekly session in the app. Automatic meeting links, smart reminders, and one-tap rescheduling — no back-and-forth needed.'],
    ['03','Progress tracked','After every session the tutor completes a checklist. AI drafts a session note. Parents see the skill map update in real time — no calls needed.'],
    ['04','Points earned','Students earn points for attending, arriving on time, and submitting homework. They redeem them for real academic rewards — teacher approved.']
  ];
  steps.forEach(function(s) {
    parts.push('<div class="how-item" style="opacity:0.7;transition:opacity 0.2s ease,transform 0.2s ease,box-shadow 0.2s ease" onmouseenter="this.style.opacity=\'1\';this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.10)\'" onmouseleave="this.style.opacity=\'0.7\';this.style.transform=\'translateY(0)\';this.style.boxShadow=\'\'">');
    parts.push('<div class="how-num">' + s[0] + '</div>');
    parts.push('<div class="how-title">' + s[1] + '</div>');
    parts.push('<div class="how-desc">' + s[2] + '</div>');
    parts.push('</div>');
  });
  parts.push('</div></div>');

  // FEATURE STRIP
  parts.push('<div class="feature-strip">');
  const features = [
    ['v','ti-brain','Smart matching','Pairs students with tutors by learning style, pace, and personality'],
    ['g','ti-chart-line','Live progress','Real-time skill maps updated after every session automatically'],
    ['a','ti-award','Points economy','Earn points for attendance and homework, redeem for real rewards'],
    ['s','ti-users','Parent visibility','Weekly digests and live progress reports for parents']
  ];
  features.forEach(function(f) {
    parts.push('<div class="feature-strip-item"><div class="fs-icon ' + f[0] + '"><i class="ti ' + f[1] + '"></i></div><div><div class="fs-title">' + f[2] + '</div><div class="fs-desc">' + f[3] + '</div></div></div>');
  });
  parts.push('</div>');

  // FOOTER
  parts.push('<footer class="site-footer">');
  parts.push('<div class="footer-copy">© 2026 Nukhba Tutoring Platform. All rights reserved.</div>');
  parts.push('<div class="footer-links">');
  parts.push('<span class="footer-link" onclick="navigate(&quot;terms&quot;)">Terms of Use</span>');
  parts.push('<span class="footer-link" onclick="navigate(&quot;privacy&quot;)">Privacy Policy</span>');
  parts.push('<span class="footer-link" onclick="openModal(&quot;login&quot;)">Sign in</span>');
  parts.push('</div></footer>');
  parts.push('</div>');

  return parts.join('');
}


// ---- LOGIN MODAL ----
function renderLoginModal() {
  const parts = [];
  parts.push('<div class="modal-overlay" id="login-modal" onclick="closeModalById(\'login-modal\')" style="">');
  parts.push('<div class="modal">');
  parts.push('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">');
  parts.push('<div style="display:flex;align-items:center;gap:10px"><div class="nav-logo-mark">N</div><div style="font-family:var(--font-display);font-size:18px;font-weight:600;color:var(--text-1)">Nukhba</div></div>');
  parts.push('<button id="close-login-btn" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px"><i class="ti ti-x"></i></button>');
  parts.push('</div>');
  parts.push('<div class="modal-title">Welcome back</div>');
  parts.push('<div class="modal-sub">Sign in to your portal — or try a demo below</div>');
  parts.push('<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" placeholder="you@example.com" /></div>');
  parts.push('<div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" placeholder="••••••••" /></div>');
  parts.push('<button class="btn btn-primary" style="width:100%;justify-content:center"><i class="ti ti-login"></i> Sign in</button>');
  parts.push('<div class="modal-divider">or try a demo portal</div>');
  parts.push('<div class="role-grid">');
  parts.push('<button class="role-btn" onclick="setUser(&quot;student&quot;,&quot;Lena M.&quot;)"><i class="ti ti-school"></i> Student</button>');
  parts.push('<button class="role-btn" onclick="setUser(&quot;tutor&quot;,&quot;Ahmed H.&quot;)"><i class="ti ti-user-check"></i> Tutor</button>');
  parts.push('<button class="role-btn" onclick="setUser(&quot;parent&quot;,&quot;Mrs. M.&quot;)"><i class="ti ti-heart-handshake"></i> Parent</button>');
  parts.push('<button class="role-btn" onclick="setUser(&quot;admin&quot;,&quot;Admin&quot;)"><i class="ti ti-shield-check"></i> Admin</button>');
  parts.push('</div>');
  parts.push('<div class="modal-footer">Don&#39;t have an account? <a href="#" onclick="toast(\"Contact your program admin to join\",\"info\")">Request access</a></div>');
  parts.push('</div></div>');
  return parts.join('');
}

// ---- APP SHELL ----
function renderShell(navItems, pageContent, title) {
  const u = State.user;
  const colorMap = { student: 'purple', tutor: 'green', parent: 'amber', admin: 'purple' };
  const initMap  = { student: u.name.split(' ').map(w=>w[0]).join(''), tutor: u.name.split(' ').map(w=>w[0]).join(''), parent: 'P', admin: 'AD' };

  return `
  <div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="nav-logo-mark">N</div>
        <div>
          <div class="nav-logo-text">Nukhba</div>
          <div style="font-size:10px;color:var(--text-3);text-transform:capitalize">${u.role} portal</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${navItems}
      </nav>

      <div class="sidebar-user">
        ${Avatar(initMap[u.role]||'U', colorMap[u.role]||'purple', 34)}
        <div>
          <div class="user-name">${u.name}</div>
          <div class="user-role" style="text-transform:capitalize">${u.role}</div>
        </div>
        <button class="btn btn-icon btn-ghost" onclick="setUser(null,null);State.user=null;State.page='landing';render()" title="Sign out">
          <i class="ti ti-logout" style="font-size:16px"></i>
        </button>
      </div>
    </aside>

    <div class="main-content">
      <div class="topbar">
        <div class="flex items-center gap-12">
          <button class="btn btn-icon btn-ghost" id="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')" style="display:none">
            <i class="ti ti-menu-2"></i>
          </button>
          <div class="topbar-title">${title}</div>
        </div>
        <div class="topbar-right">
          <button class="btn btn-icon btn-secondary" onclick="toast('No new notifications','info')" title="Notifications">
            <i class="ti ti-bell"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="toast('Settings coming soon','info')">
            <i class="ti ti-settings"></i>
          </button>
        </div>
      </div>
      <div class="page">
        ${pageContent}
      </div>
    </div>
  </div>`;
}

// ============================================
// STUDENT PORTAL
// ============================================

function studentNav() {
  const items = [
    { id: 'student-dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'student-sessions', icon: 'ti-calendar', label: 'My sessions' },
    { id: 'student-progress', icon: 'ti-chart-line', label: 'Progress' },
    { id: 'student-points', icon: 'ti-coins', label: 'Points & rewards' },
    { id: 'student-messages', icon: 'ti-message-2', label: 'Messages' },
  ];
  return items.map(i => `
    <div class="nav-item ${State.page===i.id?'active':''}" onclick="navigate('${i.id}')">
      <i class="ti ${i.icon}"></i> ${i.label}
    </div>`).join('');
}

function renderStudentDashboard() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Good afternoon, Lena 👋</div>
      <div class="page-sub">Your next session is tomorrow at 4:00 PM with Ahmed H.</div>
    </div>
    <button class="btn btn-primary" onclick="navigate('student-sessions')">
      <i class="ti ti-calendar-plus"></i> Book session
    </button>
  </div>

  <!-- XP card -->
  <div class="xp-card">
    <div class="flex items-center justify-between mb-12">
      <div>
        <div class="xp-big">1,240</div>
        <div class="xp-lbl">Total points earned</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;color:var(--text-3);margin-bottom:4px">Current tier</div>
        ${Badge('Rising Star', 'v')}
      </div>
    </div>
    <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:83%"></div></div>
    <div class="flex justify-between text-xs text-3 mb-4">
      <span class="xp-tier">260 points to Scholar tier</span>
      <span>1,240 / 1,500</span>
    </div>
  </div>

  <div class="grid-2 mb-24">
    <!-- Streak -->
    <div class="card">
      <div class="card-title">Attendance streak</div>
      <div class="flex items-center gap-12 mb-16">
        <div style="font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--amber)">7</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text-1)">Week streak</div>
          <div class="text-sm text-3">1 freeze available</div>
        </div>
      </div>
      <div class="streak-calendar">
        ${['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10'].map((w,i)=>`
          <div class="streak-week">
            <div class="streak-dot ${i===9?'today':i<8?'done':''}">${w}</div>
            <div class="streak-wk">${i===9?'Now':i===1?'❄️':''}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Quick stats -->
    <div class="card">
      <div class="card-title">This semester</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-1)">12</div>
          <div class="text-xs text-3 mb-4">Sessions</div>
        </div>
        <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--teal)">9</div>
          <div class="text-xs text-3 mb-4">Skills covered</div>
        </div>
        <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--accent)">67%</div>
          <div class="text-xs text-3 mb-4">Goal progress</div>
        </div>
        <div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--amber)">940</div>
          <div class="text-xs text-3 mb-4">Points balance</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Next session -->
  <div class="card mb-24">
    <div class="card-title">Next session</div>
    <div class="session-card" style="background:var(--accent-soft);border-color:rgba(108,99,255,0.3)">
      <div class="session-time">
        <div class="session-time-val">4:00</div>
        <div class="session-time-day">Tomorrow</div>
      </div>
      <div class="session-body">
        <div class="session-student">SAT Math — with Ahmed H.</div>
        <div class="session-meta">
          <i class="ti ti-clock"></i> 60 min
          <i class="ti ti-video"></i> Online (Zoom)
          <i class="ti ti-book"></i> Focus: Quadratic functions
        </div>
      </div>
      <div class="flex gap-8" style="flex-shrink:0">
        <button class="btn btn-primary btn-sm" onclick="toast('Zoom link copied!','success')">
          <i class="ti ti-video"></i> Join
        </button>
        <button class="btn btn-secondary btn-sm" onclick="toast('Session rescheduled','info')">Reschedule</button>
      </div>
    </div>
  </div>

  <!-- Skill snapshot -->
  <div class="card">
    <div class="flex items-center justify-between mb-16">
      <div class="card-title" style="margin-bottom:0">Skill map snapshot</div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('student-progress')">View all →</button>
    </div>
    ${DATA.skills.map(s => `
    <div class="skill-row">
      <div class="skill-name">${s.name}</div>
      <div class="skill-bar-wrap">${ProgressBar(s.pct, s.status === 'mastered' ? 'teal' : s.status === 'progress' ? 'amber' : 'danger')}</div>
      <div class="skill-pct">${s.pct}%</div>
      ${s.status === 'mastered' ? Badge('Mastered','g') : s.status === 'progress' ? Badge('In progress','a') : Badge('Not started','r')}
    </div>`).join('')}
  </div>`;

  return renderShell(studentNav(), content, 'Dashboard');
}

function renderStudentSessions() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">My sessions</div>
      <div class="page-sub">Upcoming and past sessions with your tutor</div>
    </div>
    <button class="btn btn-primary" onclick="toast('Booking flow coming soon — tutor will set availability','info')">
      <i class="ti ti-calendar-plus"></i> Request session
    </button>
  </div>

  <div class="card mb-24">
    <div class="card-title">Upcoming</div>
    ${DATA.sessions.map(s => `
    <div class="session-card">
      <div class="session-time">
        <div class="session-time-val">${s.time.split(':')[0]+':'+s.time.split(':')[1].split(' ')[0]}</div>
        <div class="session-time-day">${s.day}</div>
      </div>
      <div class="session-body">
        <div class="session-student">${s.subject}</div>
        <div class="session-meta">
          <i class="ti ti-clock"></i>${s.duration}
          <i class="ti ti-video"></i>Online
          ${StatusBadge(s.status)}
        </div>
      </div>
      <div class="flex gap-8" style="flex-shrink:0">
        <button class="btn btn-primary btn-sm" onclick="toast('Joining session...','success')"><i class="ti ti-video"></i></button>
        <button class="btn btn-secondary btn-sm" onclick="toast('Rescheduled!','info')"><i class="ti ti-calendar-event"></i></button>
      </div>
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Past sessions</div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Date</th><th>Subject</th><th>Duration</th><th>Homework</th><th>Note</th>
        </tr></thead>
        <tbody>
          <tr><td>Jun 9</td><td>SAT Math</td><td>60 min</td><td>${Badge('Submitted','g')}</td><td><button class="btn btn-ghost btn-sm" onclick="toast('Session note opened','info')">View note</button></td></tr>
          <tr><td>Jun 2</td><td>SAT Math</td><td>60 min</td><td>${Badge('Submitted','g')}</td><td><button class="btn btn-ghost btn-sm" onclick="toast('Session note opened','info')">View note</button></td></tr>
          <tr><td>May 26</td><td>SAT Math</td><td>60 min</td><td>${Badge('Late','a')}</td><td><button class="btn btn-ghost btn-sm" onclick="toast('Session note opened','info')">View note</button></td></tr>
          <tr><td>May 19</td><td>SAT Math</td><td>60 min</td><td>${Badge('Submitted','g')}</td><td><button class="btn btn-ghost btn-sm" onclick="toast('Session note opened','info')">View note</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
  return renderShell(studentNav(), content, 'My Sessions');
}

function renderStudentProgress() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">My progress</div>
      <div class="page-sub">SAT Math · Goal: 680+ score · 67% there</div>
    </div>
    <div class="flex gap-8">
      ${Badge('On track', 'g')}
    </div>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-calendar-check"></i></div><div class="stat-val">12</div><div class="stat-lbl">Sessions complete</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-clock"></i></div><div class="stat-val">18h</div><div class="stat-lbl">Total study time</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-star"></i></div><div class="stat-val">9</div><div class="stat-lbl">Skills covered</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-target-arrow"></i></div><div class="stat-val">67%</div><div class="stat-lbl">Goal progress</div></div>
  </div>

  <div class="grid-2 mb-24">
    <div class="card">
      <div class="card-title">Skill map — SAT Math</div>
      ${DATA.skills.map(s => `
      <div class="skill-row">
        <div style="flex:1">
          <div class="skill-name">${s.name}</div>
          <div style="margin-top:6px">${ProgressBar(s.pct, s.status==='mastered'?'teal':s.status==='progress'?'amber':'danger')}</div>
        </div>
        <div style="min-width:48px;text-align:right">
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${s.pct}%</div>
          <div style="margin-top:4px">${s.status==='mastered'?Badge('✓','g'):s.status==='progress'?Badge('~','a'):Badge('–','r')}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">Session history</div>
      ${[
        { week: 'Jun 9', topic: 'Quadratic functions', flag: 'Negative coefficients need work' },
        { week: 'Jun 2', topic: 'Systems of equations', flag: 'Elimination method needs review' },
        { week: 'May 26', topic: 'Linear equations', flag: 'Mastered ✓' },
        { week: 'May 19', topic: 'Linear equations intro', flag: null },
      ].map(s => `
      <div style="padding:12px 0;border-bottom:1px solid var(--border-2)">
        <div class="flex justify-between items-center mb-4">
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${s.topic}</div>
          <div style="font-size:11px;color:var(--text-3)">${s.week}</div>
        </div>
        ${s.flag ? `<div style="font-size:12px;color:var(--text-3)"><i class="ti ti-flag" style="font-size:13px"></i> ${s.flag}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Goal trajectory</div>
    <div style="display:flex;align-items:center;gap:20px;padding:12px 0">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:8px">Progress toward SAT 680+</div>
        ${ProgressBar(67, 'grad', 10)}
        <div style="font-size:12px;color:var(--text-3);margin-top:6px">67% — estimated to reach goal in 6 more sessions if current pace continues</div>
      </div>
      <div style="text-align:center;padding:16px 24px;background:var(--teal-soft);border-radius:var(--radius-lg)">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--teal)">6</div>
        <div style="font-size:11px;color:var(--teal)">sessions left</div>
      </div>
    </div>
  </div>`;
  return renderShell(studentNav(), content, 'Progress');
}

function renderStudentPoints() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Points & rewards</div>
      <div class="page-sub">Earn points for attendance and homework — spend them on real rewards</div>
    </div>
  </div>

  <!-- Wallet -->
  <div class="xp-card mb-24">
    <div class="flex items-center justify-between">
      <div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Points balance</div>
        <div class="xp-big">940</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">How to earn more</div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <span style="font-size:12px;color:var(--text-2)">Attend session <span style="color:var(--teal);font-weight:600">+50</span></span>
          <span style="font-size:12px;color:var(--text-2)">On time <span style="color:var(--teal);font-weight:600">+10</span></span>
          <span style="font-size:12px;color:var(--text-2)">Homework on time <span style="color:var(--teal);font-weight:600">+30</span></span>
          <span style="font-size:12px;color:var(--text-2)">Weekly streak <span style="color:var(--amber);font-weight:600">+10/wk</span></span>
        </div>
      </div>
    </div>
  </div>

  <!-- Rewards store -->
  <div class="card mb-24">
    <div class="flex items-center justify-between mb-16">
      <div class="card-title" style="margin-bottom:0">Rewards store</div>
      <div class="text-sm text-3">All redemptions require teacher approval</div>
    </div>
    <div class="reward-grid">
      ${DATA.rewards.map(r => `
      <div class="reward-card" onclick="toast('Redemption request sent to teacher!','success')">
        <div class="reward-icon">${r.icon}</div>
        <div class="reward-name">${r.name}</div>
        <div class="reward-cost">${r.cost} pts</div>
        <div class="reward-desc">${r.desc}</div>
        <button class="btn btn-secondary btn-sm" style="width:100%">Redeem</button>
      </div>`).join('')}
    </div>
  </div>

  <!-- Transaction history -->
  <div class="card">
    <div class="card-title">Recent transactions</div>
    ${[
      { type: '+', label: 'Attended session — Jun 9', pts: 50, color: 'var(--teal)' },
      { type: '+', label: 'On-time arrival — Jun 9', pts: 10, color: 'var(--teal)' },
      { type: '-', label: 'Redeemed — Quiz retake', pts: 400, color: 'var(--danger)' },
      { type: '+', label: 'Homework on time — Jun 2', pts: 30, color: 'var(--teal)' },
      { type: '+', label: 'Weekly streak bonus (week 6)', pts: 10, color: 'var(--amber)' },
      { type: '+', label: 'Attended session — Jun 2', pts: 50, color: 'var(--teal)' },
    ].map(t => `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-2)">
      <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${t.type==='+'?'var(--teal-soft)':'var(--danger-soft)'}">
        <i class="ti ti-${t.type==='+' ? 'plus':'minus'}" style="font-size:13px;color:${t.color}"></i>
      </div>
      <div style="flex:1;font-size:13px;color:var(--text-1)">${t.label}</div>
      <div style="font-size:13px;font-weight:600;color:${t.color}">${t.type}${t.pts}</div>
    </div>`).join('')}
  </div>`;
  return renderShell(studentNav(), content, 'Points & Rewards');
}

function renderStudentMessages() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Messages</div>
      <div class="page-sub">Chat with your tutor — all conversations are logged</div>
    </div>
  </div>
  <div class="grid-2" style="height:calc(100vh - 200px);min-height:400px">
    <div class="card" style="overflow-y:auto">
      <div class="card-title">Conversations</div>
      ${[
        { name: 'Ahmed H.', role: 'Your tutor', last: 'Don\'t forget to review the homework before tomorrow!', time: '2h ago', initials: 'AH', color: 'green', unread: 1 },
        { name: 'Program Admin', role: 'Admin', last: 'Welcome to Nukhba! Let us know if you need anything.', time: '3d ago', initials: 'AD', color: 'purple', unread: 0 },
      ].map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--radius-md);cursor:pointer;transition:background var(--transition)" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''" onclick="toast('Conversation opened','info')">
        ${Avatar(c.initials, c.color, 40)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <div style="font-size:13px;font-weight:600;color:var(--text-1)">${c.name}</div>
            <div style="font-size:11px;color:var(--text-3)">${c.time}</div>
          </div>
          <div style="font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.last}</div>
        </div>
        ${c.unread ? `<div style="width:18px;height:18px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${c.unread}</div>` : ''}
      </div>`).join('')}
    </div>

    <div class="card" style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px">
        ${Avatar('AH', 'green', 36)}
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text-1)">Ahmed H.</div>
          <div style="font-size:12px;color:var(--teal)">● Online</div>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
        ${[
          { from: 'tutor', msg: 'Great work on linear equations today, Lena! You\'re really getting it.', time: 'Jun 9, 4:58 PM' },
          { from: 'student', msg: 'Thank you! I practiced the completing the square method too.', time: 'Jun 9, 5:10 PM' },
          { from: 'tutor', msg: 'Perfect! Don\'t forget to review the homework before tomorrow\'s session — focus on the negative coefficient problems.', time: '2 hours ago' },
        ].map(m => `
        <div style="display:flex;flex-direction:column;align-items:${m.from==='student'?'flex-end':'flex-start'};gap:3px">
          <div style="max-width:80%;padding:10px 14px;border-radius:${m.from==='student'?'14px 14px 4px 14px':'14px 14px 14px 4px'};background:${m.from==='student'?'var(--accent)':'var(--surface-2)'};font-size:13px;color:${m.from==='student'?'#fff':'var(--text-1)'};line-height:1.5">${m.msg}</div>
          <div style="font-size:10px;color:var(--text-3)">${m.time}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <input class="input" placeholder="Type a message..." style="flex:1" />
        <button class="btn btn-primary" onclick="toast('Message sent!','success')"><i class="ti ti-send"></i></button>
      </div>
    </div>
  </div>`;
  return renderShell(studentNav(), content, 'Messages');
}

// ============================================
// TUTOR PORTAL
// ============================================

function tutorNav() {
  const items = [
    { id: 'tutor-dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'tutor-sessions', icon: 'ti-calendar', label: 'Sessions' },
    { id: 'tutor-students', icon: 'ti-users', label: 'My students' },
    { id: 'tutor-notes', icon: 'ti-notes', label: 'Session notes' },
    { id: 'tutor-hours', icon: 'ti-clock', label: 'Hour log' },
    { id: 'tutor-messages', icon: 'ti-message-2', label: 'Messages' },
  ];
  return items.map(i => `
    <div class="nav-item ${State.page===i.id?'active':''}" onclick="navigate('${i.id}')">
      <i class="ti ${i.icon}"></i> ${i.label}
    </div>`).join('');
}

function renderTutorDashboard() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Good afternoon, Ahmed 👋</div>
      <div class="page-sub">You have 2 active students and 1 session tomorrow</div>
    </div>
    <button class="btn btn-primary" onclick="navigate('tutor-notes')">
      <i class="ti ti-notes"></i> New session note
    </button>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-users"></i></div><div class="stat-val">2</div><div class="stat-lbl">Active students</div></div>
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-clock"></i></div><div class="stat-val">24h</div><div class="stat-lbl">This month</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-calendar-check"></i></div><div class="stat-val">18</div><div class="stat-lbl">Sessions done</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-trending-up"></i></div><div class="stat-val">96h</div><div class="stat-lbl">Total hours</div></div>
  </div>

  <div class="grid-2 mb-24">
    <div class="card">
      <div class="card-title">Upcoming sessions</div>
      ${DATA.sessions.filter((_,i)=>i<2).map(s => `
      <div class="session-card">
        <div class="session-time">
          <div class="session-time-val">${s.time.replace(' PM','')}</div>
          <div class="session-time-day">${s.day}</div>
        </div>
        <div class="session-body">
          <div class="session-student">${s.student}</div>
          <div class="session-meta"><i class="ti ti-book"></i>${s.subject} · ${s.duration} ${StatusBadge(s.status)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="toast('Zoom link copied!','success')"><i class="ti ti-video"></i></button>
      </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">Student overview</div>
      ${DATA.students.filter(s=>s.tutor==='Ahmed H.').map(s => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-2)">
        ${Avatar(s.initials, s.color, 36)}
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:2px">${s.name}</div>
          <div style="font-size:11px;color:var(--text-3)">${s.subject} · Grade ${s.grade}</div>
          <div style="margin-top:6px">${ProgressBar(s.goal,'grad',4)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:600;color:var(--text-1)">${s.goal}%</div>
          <div>${StatusBadge(s.status)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Hour log — June 2026</div>
    <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
      <div style="font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--accent)">24h</div>
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:6px">This month · 96h total in 2026</div>
        <div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:100%"></div></div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="toast('Hour report exported as PDF','success')">
        <i class="ti ti-download"></i> Export PDF
      </button>
    </div>
  </div>`;
  return renderShell(tutorNav(), content, 'Dashboard');
}

function renderTutorNotes() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Session notes</div>
      <div class="page-sub">Complete the checklist after each session — AI drafts the note for you</div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="card mb-16">
        <div class="card-title">Session details</div>
        <div class="input-group">
          <label class="input-label">Student</label>
          <select class="select">
            <option>Lena M. — SAT Math</option>
            <option>Yara S. — Math basics</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Session date</label>
          <input class="input" type="date" value="2026-06-10" />
        </div>
        <div class="input-group">
          <label class="input-label">Duration</label>
          <select class="select">
            <option>45 minutes</option>
            <option selected>60 minutes</option>
            <option>90 minutes</option>
          </select>
        </div>
      </div>

      <div class="card mb-16">
        <div class="card-title">What was covered</div>
        ${DATA.checklistTopics.map((t,i) => `
        <div class="checklist-item" data-check="${i}" onclick="toggleCheck(${i})">
          <div class="checklist-cb"></div>
          <div class="checklist-text">${t}</div>
        </div>`).join('')}
      </div>

      <div class="card mb-16">
        <div class="card-title">Student understanding (1–5)</div>
        <div class="input-group">
          <label class="input-label">Understanding rating</label>
          <select class="select" id="rating-select">
            <option>5 — Excellent, fully understood</option>
            <option>4 — Good, minor gaps</option>
            <option selected>3 — Moderate, needs reinforcement</option>
            <option>2 — Struggled, revisit next session</option>
            <option>1 — Did not grasp topic</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Flag for next session (optional)</label>
          <input class="input" placeholder="e.g. Negative coefficients need more work" />
        </div>
        <div class="input-group">
          <label class="input-label">Homework assigned</label>
          <input class="input" placeholder="e.g. 10 quadratic practice problems" />
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%" onclick="generateNote()">
        <i class="ti ti-sparkles"></i> Generate AI session note
      </button>
    </div>

    <div class="card" id="note-output">
      <div class="card-title">AI-drafted note</div>
      <div class="empty-state">
        <i class="ti ti-sparkles"></i>
        <p>Complete the checklist and click Generate — your session note will appear here ready to review and approve.</p>
      </div>
    </div>
  </div>`;
  return renderShell(tutorNav(), content, 'Session Notes');
}

function generateNote() {
  const noteEl = document.getElementById('note-output');
  if (!noteEl) return;
  noteEl.innerHTML = `
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
      AI-drafted note
      <span style="font-size:11px;color:var(--teal);display:flex;align-items:center;gap:4px"><i class="ti ti-sparkles"></i> Generated</span>
    </div>
    <div style="font-size:13px;line-height:1.8;color:var(--text-2);background:var(--surface-2);border-radius:var(--radius-md);padding:16px;margin-bottom:14px">
      <strong style="color:var(--text-1)">Session — Jun 10, 2026 · Lena M. · 60 min</strong><br><br>
      In today\'s session, we focused on quadratic functions — specifically vertex form and completing the square. Lena showed solid understanding of standard form conversion but struggled with negative leading coefficients, which will need reinforcement next session.<br><br>
      We reviewed two past SAT problems related to parabolas. Engagement was good throughout. Homework assigned: 10 quadratic practice problems focusing on the completing-the-square method.<br><br>
      <strong style="color:var(--amber)">Flag for next session:</strong> Revisit negative coefficients in quadratic expressions before moving to factoring.
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-success" style="flex:1" onclick="toast('Note approved and sent to parent!','success')">
        <i class="ti ti-check"></i> Approve & send
      </button>
      <button class="btn btn-secondary" onclick="toast('You can edit the note directly','info')">
        <i class="ti ti-edit"></i> Edit
      </button>
    </div>`;
}

function renderTutorHours() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Hour log</div>
      <div class="page-sub">Every session is logged automatically — export anytime for grant reporting</div>
    </div>
    <button class="btn btn-primary" onclick="toast('PDF report exported!','success')">
      <i class="ti ti-download"></i> Export PDF report
    </button>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-calendar"></i></div><div class="stat-val">24h</div><div class="stat-lbl">This month</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-clock"></i></div><div class="stat-val">96h</div><div class="stat-lbl">Total 2026</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-users"></i></div><div class="stat-val">2</div><div class="stat-lbl">Students served</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-check"></i></div><div class="stat-val">100%</div><div class="stat-lbl">Attendance rate</div></div>
  </div>

  <div class="card mb-24">
    <div class="card-title">Monthly breakdown — 2026</div>
    ${[
      { month: 'June', hrs: 24, max: 24 },
      { month: 'May', hrs: 22, max: 24 },
      { month: 'April', hrs: 20, max: 24 },
      { month: 'March', hrs: 18, max: 24 },
      { month: 'February', hrs: 12, max: 24 },
    ].map(m => `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border-2)">
      <div style="font-size:13px;color:var(--text-2);min-width:80px">${m.month}</div>
      <div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:${(m.hrs/m.max)*100}%"></div></div>
      <div style="font-size:13px;font-weight:600;color:var(--text-1);min-width:40px;text-align:right">${m.hrs}h</div>
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Session log</div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Date</th><th>Student</th><th>Subject</th><th>Duration</th><th>Status</th></tr></thead>
        <tbody>
          ${[
            { date: 'Jun 9', student: 'Lena M.', subject: 'SAT Math', dur: '60 min', status: 'confirmed' },
            { date: 'Jun 7', student: 'Yara S.', subject: 'Math basics', dur: '45 min', status: 'confirmed' },
            { date: 'Jun 2', student: 'Lena M.', subject: 'SAT Math', dur: '60 min', status: 'confirmed' },
            { date: 'May 31', student: 'Yara S.', subject: 'Math basics', dur: '45 min', status: 'confirmed' },
            { date: 'May 26', student: 'Lena M.', subject: 'SAT Math', dur: '60 min', status: 'confirmed' },
          ].map(r => `
          <tr>
            <td>${r.date}</td>
            <td class="table-name">${Avatar(r.student.split(' ').map(w=>w[0]).join(''), 'purple', 28)}<span>${r.student}</span></td>
            <td>${r.subject}</td>
            <td>${r.dur}</td>
            <td>${StatusBadge(r.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
  return renderShell(tutorNav(), content, 'Hour Log');
}

// ============================================
// PARENT PORTAL
// ============================================

function parentNav() {
  const items = [
    { id: 'parent-dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'parent-progress', icon: 'ti-chart-line', label: 'Progress' },
    { id: 'parent-sessions', icon: 'ti-calendar', label: 'Sessions' },
    { id: 'parent-messages', icon: 'ti-message-2', label: 'Messages' },
  ];
  return items.map(i => `
    <div class="nav-item ${State.page===i.id?'active':''}" onclick="navigate('${i.id}')">
      <i class="ti ${i.icon}"></i> ${i.label}
    </div>`).join('');
}

function renderParentDashboard() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Hello, Mrs. M. 👋</div>
      <div class="page-sub">Here\'s how Lena is doing this week</div>
    </div>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-target-arrow"></i></div><div class="stat-val">67%</div><div class="stat-lbl">Goal progress</div></div>
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-calendar-check"></i></div><div class="stat-val">12</div><div class="stat-lbl">Sessions attended</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-flame"></i></div><div class="stat-val">7</div><div class="stat-lbl">Week streak</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-coins"></i></div><div class="stat-val">940</div><div class="stat-lbl">Points balance</div></div>
  </div>

  <div class="grid-2 mb-24">
    <div class="card">
      <div class="card-title">Latest session — Jun 9</div>
      <div style="padding:14px;background:var(--surface-2);border-radius:var(--radius-md);margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:6px">SAT Math · Quadratic functions</div>
        <div style="font-size:13px;color:var(--text-2);line-height:1.7">Lena showed solid understanding of vertex form but struggled with negative leading coefficients. Engagement was strong throughout. Homework assigned: 10 practice problems on completing the square.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-3)">
        ${Avatar('AH','green',26)} Tutored by Ahmed H. · 60 min
      </div>
    </div>

    <div class="card">
      <div class="card-title">Skill map — SAT Math</div>
      ${DATA.skills.map(s => `
      <div class="skill-row">
        <div class="skill-name">${s.name}</div>
        <div class="skill-bar-wrap">${ProgressBar(s.pct, s.status==='mastered'?'teal':s.status==='progress'?'amber':'danger')}</div>
        <div class="skill-pct">${s.pct}%</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Goal trajectory</div>
    <div style="display:flex;align-items:center;gap:20px">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:8px">SAT 680+ target · Currently 67% of the way there</div>
        ${ProgressBar(67,'grad',10)}
        <div style="font-size:12px;color:var(--text-3);margin-top:6px">On track — estimated 6 more sessions to reach goal at current pace</div>
      </div>
      <div style="text-align:center;padding:16px 24px;background:var(--teal-soft);border-radius:var(--radius-lg)">
        <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--teal)">On track</div>
        <div style="font-size:11px;color:var(--teal)">6 sessions to goal</div>
      </div>
    </div>
  </div>`;
  return renderShell(parentNav(), content, 'Dashboard');
}

// ============================================
// ADMIN PORTAL
// ============================================

function adminNav() {
  const items = [
    { id: 'admin-dashboard', icon: 'ti-layout-dashboard', label: 'Command center', badge: 3 },
    { id: 'admin-students', icon: 'ti-users', label: 'Students' },
    { id: 'admin-tutors', icon: 'ti-user-check', label: 'Tutors' },
    { id: 'admin-matching', icon: 'ti-brain', label: 'Match engine' },
    { id: 'admin-approvals', icon: 'ti-check', label: 'Approvals', badge: DATA.approvals.length },
    { id: 'admin-hours', icon: 'ti-clock', label: 'Hour reports' },
  ];
  return items.map(i => `
    <div class="nav-item ${State.page===i.id?'active':''}" onclick="navigate('${i.id}')">
      <i class="ti ${i.icon}"></i> ${i.label}
      ${i.badge ? `<span class="nav-badge">${i.badge}</span>` : ''}
    </div>`).join('');
}

function renderAdminDashboard() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Command center</div>
      <div class="page-sub">Everything happening in your program, right now</div>
    </div>
    <div class="flex gap-8">
      <button class="btn btn-secondary" onclick="toast('Report generated','success')"><i class="ti ti-download"></i> Export report</button>
      <button class="btn btn-primary" onclick="navigate('admin-students')"><i class="ti ti-user-plus"></i> Add student</button>
    </div>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-users"></i></div><div class="stat-val">${DATA.students.length}</div><div class="stat-lbl">Active students</div></div>
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-user-check"></i></div><div class="stat-val">${DATA.tutors.length}</div><div class="stat-lbl">Active tutors</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-clock"></i></div><div class="stat-val">40h</div><div class="stat-lbl">Hours this month</div></div>
    <div class="stat-card"><div class="stat-icon r"><i class="ti ti-alert-triangle"></i></div><div class="stat-val">1</div><div class="stat-lbl">Needs attention</div></div>
  </div>

  <!-- Alerts -->
  <div class="card mb-24">
    <div class="card-title">Alerts requiring action</div>
    <div class="alert-item warn">
      <i class="ti ti-alert-triangle alert-icon" style="color:var(--amber)"></i>
      <div style="flex:1">
        <div class="alert-title">High no-show risk — Yara S.</div>
        <div class="alert-body">72% no-show risk for Jun 14 session. Last 3 sessions: 1 attended, 2 late-cancelled. SMS reminder sent.</div>
        <div class="alert-actions">
          <button class="btn btn-secondary btn-sm" onclick="toast('Parent message opened','info')">Message parent</button>
          <button class="btn btn-ghost btn-sm" onclick="this.closest('.alert-item').remove();toast('Alert dismissed','info')">Dismiss</button>
        </div>
      </div>
    </div>
    <div class="alert-item info">
      <i class="ti ti-brain alert-icon" style="color:var(--accent)"></i>
      <div style="flex:1">
        <div class="alert-title">Rematch suggestion — Yara S. & Ahmed H.</div>
        <div class="alert-body">3 consecutive sessions show no skill map advancement. 2 alternative tutors identified with higher predicted compatibility.</div>
        <div class="alert-actions">
          <button class="btn btn-primary btn-sm" onclick="navigate('admin-matching')">Review matches</button>
          <button class="btn btn-ghost btn-sm" onclick="this.closest('.alert-item').remove();toast('Dismissed','info')">Dismiss</button>
        </div>
      </div>
    </div>
    <div class="alert-item">
      <i class="ti ti-user-plus alert-icon" style="color:var(--teal)"></i>
      <div style="flex:1">
        <div class="alert-title">New student application — Khalid A.</div>
        <div class="alert-body">Grade 9 · SAT Math · Applied 1 day ago. Pending admin approval before joining the program.</div>
        <div class="alert-actions">
          <button class="btn btn-success btn-sm" onclick="toast('Student approved and welcomed!','success');this.closest('.alert-item').remove()">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="toast('Application declined','error');this.closest('.alert-item').remove()">Decline</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sessions today -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Sessions next 48 hours</div>
      ${DATA.sessions.map(s => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-2)">
        ${Avatar(s.initials,'purple',32)}
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${s.student}</div>
          <div style="font-size:11px;color:var(--text-3)">${s.day} · ${s.time}</div>
        </div>
        <div style="min-width:60px;text-align:center">
          <div style="font-size:12px;font-weight:600;color:${s.risk>60?'var(--danger)':s.risk>35?'var(--amber)':'var(--teal)'}">${s.risk}%</div>
          <div style="font-size:10px;color:var(--text-3)">no-show</div>
        </div>
        ${StatusBadge(s.status)}
      </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title">Pending reward approvals</div>
      ${DATA.approvals.slice(0,3).map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-2)">
        ${Avatar(a.initials,'purple',30)}
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--text-1)">${a.student}</div>
          <div style="font-size:11px;color:var(--text-3)">${a.reward} · ${a.cost} pts</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-success btn-sm" onclick="toast('Approved!','success')"><i class="ti ti-check"></i></button>
          <button class="btn btn-danger btn-sm" onclick="toast('Denied','error')"><i class="ti ti-x"></i></button>
        </div>
      </div>`).join('')}
      <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="navigate('admin-approvals')">View all approvals →</button>
    </div>
  </div>`;
  return renderShell(adminNav(), content, 'Command Center');
}

function renderAdminStudents() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Students</div>
      <div class="page-sub">${DATA.students.length} active students across all subjects</div>
    </div>
    <button class="btn btn-primary" onclick="toast('Student onboarding form opened','info')">
      <i class="ti ti-user-plus"></i> Add student
    </button>
  </div>

  <div class="card">
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <div class="input-with-icon" style="flex:1;min-width:200px">
        <i class="ti ti-search"></i>
        <input class="input" placeholder="Search students..." />
      </div>
      <select class="select" style="width:160px">
        <option>All subjects</option>
        <option>SAT Math</option>
        <option>Math basics</option>
        <option>Literature</option>
      </select>
      <select class="select" style="width:160px">
        <option>All statuses</option>
        <option>On track</option>
        <option>Needs attention</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Student</th><th>Subject</th><th>Tutor</th><th>Sessions</th><th>Goal</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${DATA.students.map(s => `
          <tr>
            <td class="table-name">${Avatar(s.initials, s.color, 32)}<div><div style="font-size:13px;font-weight:600">${s.name}</div><div style="font-size:11px;color:var(--text-3)">Grade ${s.grade}</div></div></td>
            <td>${s.subject}</td>
            <td class="table-name">${Avatar(s.tutor.split(' ').map(w=>w[0]).join(''), 'green', 26)}<span>${s.tutor}</span></td>
            <td>${s.sessions}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:60px">${ProgressBar(s.goal,'grad',4)}</div>
                <span style="font-size:12px;font-weight:600;color:var(--text-1)">${s.goal}%</span>
              </div>
            </td>
            <td>${StatusBadge(s.status)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="toast('Student profile opened','info')"><i class="ti ti-eye"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
  return renderShell(adminNav(), content, 'Students');
}

function renderAdminTutors() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Tutors</div>
      <div class="page-sub">${DATA.tutors.length} active tutors · 40h total this month</div>
    </div>
    <button class="btn btn-primary" onclick="toast('Tutor onboarding form opened','info')">
      <i class="ti ti-user-plus"></i> Add tutor
    </button>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
    ${DATA.tutors.map(t => `
    <div class="card card-hover">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        ${Avatar(t.initials, t.color, 48)}
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--text-1)">${t.name}</div>
          <div style="font-size:12px;color:var(--text-3)">${t.subjects.join(' · ')}</div>
        </div>
        ${Badge('Active','g')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--accent)">${t.monthHours}h</div>
          <div style="font-size:10px;color:var(--text-3)">This month</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--teal)">${t.totalHours}h</div>
          <div style="font-size:10px;color:var(--text-3)">Total 2026</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--text-1)">${t.students}</div>
          <div style="font-size:10px;color:var(--text-3)">Students</div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:6px">Monthly hours</div>
        <div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:${(t.monthHours/24)*100}%"></div></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="toast('Tutor profile opened','info')">View profile</button>
        <button class="btn btn-secondary btn-sm" onclick="toast('PDF exported!','success')"><i class="ti ti-download"></i> Hours PDF</button>
      </div>
    </div>`).join('')}
  </div>`;
  return renderShell(adminNav(), content, 'Tutors');
}

function renderAdminMatching() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Match engine</div>
      <div class="page-sub">AI-powered compatibility scores for every student-tutor pair</div>
    </div>
  </div>

  <div class="card mb-24">
    <div class="card-title">Active matches</div>
    ${[
      { student: 'Lena M.', sInit: 'LM', sSub: 'Grade 8 · SAT Math · Visual learner', tutor: 'Ahmed H.', tSub: 'Patient · Diagram-first · SAT specialist', score: 94, dims: [97,95,92,88] },
      { student: 'Yara S.', sInit: 'YS', sSub: 'Grade 6 · Math basics · Needs encouragement', tutor: 'Ahmed H.', tSub: 'Warm tone · Verbal explanations · Nurturing', score: 74, dims: [80,72,78,65], warn: true },
      { student: 'Omar B.', sInit: 'OB', sSub: 'Grade 10 · Literature · Fast-paced', tutor: 'Sara K.', tSub: 'High-energy · Socratic method · AP Lit', score: 88, dims: [91,88,85,87] },
      { student: 'Amir K.', sInit: 'AK', sSub: 'Grade 9 · SAT Math · Competitive', tutor: 'Sara K.', tSub: 'Challenging · Data-driven · SAT expert', score: 91, dims: [93,90,94,87] },
    ].map(m => `
    <div style="border:1px solid ${m.warn?'rgba(245,166,35,0.3)':'var(--border)'};background:${m.warn?'var(--amber-soft)':'var(--surface-2)'};border-radius:var(--radius-lg);padding:14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;padding:10px;background:var(--surface);border-radius:var(--radius-md)">
          <div style="display:flex;align-items:center;gap:8px">
            ${Avatar(m.sInit,'purple',30)}
            <div><div style="font-size:13px;font-weight:600;color:var(--text-1)">${m.student}</div><div style="font-size:11px;color:var(--text-3)">${m.sSub}</div></div>
          </div>
        </div>
        <div style="text-align:center;min-width:60px">
          <div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:${m.score>85?'var(--teal)':m.score>70?'var(--amber)':'var(--danger)'}">${m.score}%</div>
          <div style="font-size:10px;color:var(--text-3)">match</div>
        </div>
        <div style="flex:1;min-width:140px;padding:10px;background:var(--surface);border-radius:var(--radius-md)">
          <div style="display:flex;align-items:center;gap:8px">
            ${Avatar(m.tutor.split(' ').map(w=>w[0]).join(''),'green',30)}
            <div><div style="font-size:13px;font-weight:600;color:var(--text-1)">${m.tutor}</div><div style="font-size:11px;color:var(--text-3)">${m.tSub}</div></div>
          </div>
        </div>
        ${m.warn ? `<button class="btn btn-secondary btn-sm" onclick="toast('Rematch options opened','info')"><i class="ti ti-refresh"></i> Rematch</button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">
        ${['Learning style','Pace & pressure','Subject depth','Personality'].map((d,i) => `
        <div style="padding:6px 8px;background:var(--surface);border-radius:var(--radius-sm)">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:4px">${d}</div>
          ${ProgressBar(m.dims[i], m.dims[i]>85?'teal':m.dims[i]>70?'amber':'danger', 4)}
          <div style="font-size:11px;font-weight:600;color:var(--text-1);margin-top:2px">${m.dims[i]}%</div>
        </div>`).join('')}
      </div>
    </div>`).join('')}
  </div>`;
  return renderShell(adminNav(), content, 'Match Engine');
}

function renderAdminApprovals() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Reward approvals</div>
      <div class="page-sub">${DATA.approvals.length} pending teacher approvals</div>
    </div>
  </div>

  <div class="card mb-24">
    <div class="card-title">Pending — ${DATA.approvals.length} requests</div>
    ${DATA.approvals.map(a => `
    <div class="approval-card" id="approval-${a.id}">
      ${Avatar(a.initials,'purple',40)}
      <div class="approval-info">
        <div class="approval-name">${a.student} — ${a.reward}</div>
        <div class="approval-meta">Balance: ${a.balance} pts · Costs: ${a.cost} pts · Remaining: ${a.balance - a.cost} pts · Tutor: ${a.tutor} · ${a.time}</div>
      </div>
      <div class="approval-cost">${a.cost} pts</div>
      <div class="approval-actions">
        <button class="btn btn-success" onclick="document.getElementById('approval-${a.id}').remove();toast('${a.student} — ${a.reward} approved!','success')">
          <i class="ti ti-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="document.getElementById('approval-${a.id}').remove();toast('Request denied','error')">
          <i class="ti ti-x"></i> Deny
        </button>
      </div>
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Approval history — this month</div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Student</th><th>Reward</th><th>Cost</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td class="table-name">${Avatar('LM','purple',26)}<span>Lena M.</span></td><td>Quiz retake</td><td>400 pts</td><td>Jun 2</td><td>${Badge('Approved','g')}</td></tr>
          <tr><td class="table-name">${Avatar('AK','purple',26)}<span>Amir K.</span></td><td>Homework pass</td><td>250 pts</td><td>May 28</td><td>${Badge('Approved','g')}</td></tr>
          <tr><td class="table-name">${Avatar('OB','amber',26)}<span>Omar B.</span></td><td>Deadline extension</td><td>200 pts</td><td>May 20</td><td>${Badge('Denied','r')}</td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
  return renderShell(adminNav(), content, 'Approvals');
}

function renderAdminHours() {
  const content = `
  <div class="page-header">
    <div>
      <div class="page-title">Hour reports</div>
      <div class="page-sub">Volunteer hour tracking for grant reporting and compliance</div>
    </div>
    <button class="btn btn-primary" onclick="toast('Full program PDF exported!','success')">
      <i class="ti ti-download"></i> Export all — PDF
    </button>
  </div>

  <div class="stat-grid mb-24">
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-clock"></i></div><div class="stat-val">40h</div><div class="stat-lbl">Total this month</div></div>
    <div class="stat-card"><div class="stat-icon v"><i class="ti ti-calendar"></i></div><div class="stat-val">160h</div><div class="stat-lbl">Total 2026</div></div>
    <div class="stat-card"><div class="stat-icon a"><i class="ti ti-users"></i></div><div class="stat-val">2</div><div class="stat-lbl">Active tutors</div></div>
    <div class="stat-card"><div class="stat-icon g"><i class="ti ti-chart-bar"></i></div><div class="stat-val">30</div><div class="stat-lbl">Sessions this month</div></div>
  </div>

  <div class="card">
    <div class="card-title">Tutor hour summary — June 2026</div>
    ${DATA.tutors.map(t => `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border-2)">
      ${Avatar(t.initials, t.color, 40)}
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:4px">${t.name}</div>
        <div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:${(t.monthHours/24)*100}%"></div></div>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${t.sessions} sessions · ${t.students} students</div>
      </div>
      <div style="text-align:center;min-width:60px">
        <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-1)">${t.monthHours}h</div>
        <div style="font-size:11px;color:var(--text-3)">this month</div>
      </div>
      <div style="text-align:center;min-width:60px">
        <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--accent)">${t.totalHours}h</div>
        <div style="font-size:11px;color:var(--text-3)">total 2026</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="toast('${t.name} PDF report exported!','success')">
        <i class="ti ti-download"></i> PDF
      </button>
    </div>`).join('')}
  </div>`;
  return renderShell(adminNav(), content, 'Hour Reports');
}


function renderTerms() {
  const nav = '<nav class="nav"><div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div></div></div><button class="btn btn-ghost" onclick="navigate(&quot;landing&quot;)">Back to home</button></nav>';
  const footer = '<footer class="site-footer"><div class="footer-copy">© 2026 Nukhba Tutoring Platform.</div><div class="footer-links"><span class="footer-link" onclick="navigate(&quot;terms&quot;)">Terms of Use</span><span class="footer-link" onclick="navigate(&quot;privacy&quot;)">Privacy Policy</span></div></footer>';
  return '<div style="min-height:100vh;background:var(--bg);position:relative"><div class="mesh-bg"><div class="mesh-orb mesh-1"></div><div class="mesh-orb mesh-2"></div></div>' + nav + '<div class="legal-page"><h1>Terms of Use</h1><div class="legal-date">Last updated: June 2026</div><p>Please read these Terms of Use carefully before using the Nukhba tutoring platform. By accessing or using our platform, you agree to be bound by these terms.</p><div class="legal-divider"></div><h2>1. About the Platform</h2><p>Nukhba is a free, nonprofit tutoring platform that connects K–12 students with qualified tutors for educational support. The platform is operated on a volunteer and community basis with no commercial intent.</p><h2>2. Eligibility</h2><p>To use this platform you must be a K–12 student, the parent or guardian of a K–12 student, or a qualified tutor — and must be approved by a program administrator before gaining full access.</p><h2>3. User Accounts</h2><p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration. Accounts may be suspended or terminated for misuse or inappropriate behavior.</p><h2>4. Acceptable Use</h2><p>You agree not to use the platform to harass or harm any other user, share inappropriate or offensive content, misrepresent your identity or qualifications, use the platform for any commercial or for-profit purpose, or attempt to gain unauthorized access to the platform or its data.</p><h2>5. Sessions and Communication</h2><p>All sessions take place through designated video platforms. Communications between tutors, students, and parents within the platform are logged and may be reviewed by administrators for safety and quality purposes.</p><h2>6. Privacy and Minors</h2><p>We take the privacy of minors very seriously. Student data is collected only as necessary to deliver tutoring services and is never sold or shared with third parties. Please refer to our Privacy Policy for full details.</p><h2>7. Disclaimers</h2><p>Nukhba provides this platform on an as-is basis. While we strive to match students with suitable tutors, we make no guarantees regarding academic outcomes. The platform is a supplemental educational resource and does not replace formal schooling.</p><h2>8. Limitation of Liability</h2><p>To the fullest extent permitted by law, Nukhba and its administrators shall not be liable for any indirect, incidental, or consequential damages arising from use of this platform.</p><h2>9. Changes to These Terms</h2><p>We may update these Terms of Use periodically. Continued use of the platform after changes are posted constitutes your acceptance of the revised terms.</p><h2>10. Contact</h2><p>For questions about these terms, please contact your program administrator through the platform messaging system.</p></div>' + footer + '</div>';
}

function renderPrivacy() {
  const nav = '<nav class="nav"><div class="nav-logo"><div class="nav-logo-mark">N</div><div><div class="nav-logo-text">Nukhba</div></div></div><button class="btn btn-ghost" onclick="navigate(&quot;landing&quot;)">Back to home</button></nav>';
  const footer = '<footer class="site-footer"><div class="footer-copy">© 2026 Nukhba Tutoring Platform.</div><div class="footer-links"><span class="footer-link" onclick="navigate(&quot;terms&quot;)">Terms of Use</span><span class="footer-link" onclick="navigate(&quot;privacy&quot;)">Privacy Policy</span></div></footer>';
  return '<div style="min-height:100vh;background:var(--bg);position:relative"><div class="mesh-bg"><div class="mesh-orb mesh-1"></div><div class="mesh-orb mesh-2"></div></div>' + nav + '<div class="legal-page"><h1>Privacy Policy</h1><div class="legal-date">Last updated: June 2026</div><p>Your privacy matters to us. This Privacy Policy explains what information we collect, how we use it, and how we protect it — particularly given that our platform serves minors.</p><div class="legal-divider"></div><h2>1. Information We Collect</h2><p>We collect account information (name, email, role), student profile data (grade, subject, learning style, goals), tutor profile data (teaching style, availability, session history), session data (dates, duration, notes, skill progress), communications through the platform inbox, and points and attendance records.</p><h2>2. How We Use Your Information</h2><p>We use your information exclusively to match students with tutors, track academic progress, send session reminders and progress updates to parents, administer the points and rewards system, maintain tutor volunteer hour records, and ensure the safety of all platform users.</p><h2>3. Protection of Minors</h2><p>Parental or guardian consent is required for students to join the program. Student data is never shared publicly. Administrators monitor communications to ensure a safe environment. Students only interact with approved tutors who have been vetted by program administrators.</p><h2>4. Data Sharing</h2><p>We do not sell, rent, or trade your personal information. We do not share your data with advertisers. Data may be shared only with program administrators for oversight, with parents regarding their child progress, with third-party service providers strictly for operating the platform, or when required by law.</p><h2>5. Data Storage and Security</h2><p>Your data is stored securely using Supabase with enterprise-grade encryption. We use row-level security so users can only access data they are authorized to view.</p><h2>6. Your Rights</h2><p>You have the right to access the personal data we hold about you, request correction of inaccurate data, and request deletion of your account and associated data. To exercise these rights, contact your program administrator.</p><h2>7. Cookies</h2><p>We use minimal, strictly necessary browser storage to maintain your session. We do not use advertising cookies or third-party tracking technologies.</p><h2>8. Data Retention</h2><p>We retain your data for as long as your account is active. Upon account deletion, personal data is removed within 30 days.</p><h2>9. Contact</h2><p>For any privacy-related questions, please contact your program administrator through the platform messaging system.</p></div>' + footer + '</div>';
}


// ============================================
// RENDER ENGINE
// ============================================

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const pageMap = {
    'landing':            renderLanding,
    'student-dashboard':  renderStudentDashboard,
    'student-sessions':   renderStudentSessions,
    'student-progress':   renderStudentProgress,
    'student-points':     renderStudentPoints,
    'student-messages':   renderStudentMessages,
    'tutor-dashboard':    renderTutorDashboard,
    'tutor-sessions':     () => renderShell(tutorNav(), `<div class="page-header"><div class="page-title">Sessions</div></div>${DATA.sessions.map(s=>`<div class="session-card"><div class="session-time"><div class="session-time-val">${s.time.replace(' PM','')}</div><div class="session-time-day">${s.day}</div></div><div class="session-body"><div class="session-student">${s.student}</div><div class="session-meta"><i class="ti ti-book"></i>${s.subject} · ${s.duration} ${StatusBadge(s.status)}</div></div><div class="flex gap-8"><button class="btn btn-primary btn-sm" onclick="toast('Joining...','success')"><i class="ti ti-video"></i></button><button class="btn btn-secondary btn-sm" onclick="toast('Note opened','info')"><i class="ti ti-notes"></i></button></div></div>`).join('')}`, 'Sessions'),
    'tutor-students':     () => renderShell(tutorNav(), `<div class="page-header"><div class="page-title">My students</div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Subject</th><th>Sessions</th><th>Goal</th><th>Status</th></tr></thead><tbody>${DATA.students.filter(s=>s.tutor==='Ahmed H.').map(s=>`<tr><td class="table-name">${Avatar(s.initials,s.color,30)}<div><div style="font-size:13px;font-weight:600">${s.name}</div><div style="font-size:11px;color:var(--text-3)">Grade ${s.grade}</div></div></td><td>${s.subject}</td><td>${s.sessions}</td><td><div class="flex items-center gap-8"><div style="width:70px">${ProgressBar(s.goal,'grad',4)}</div><span style="font-size:12px;font-weight:600">${s.goal}%</span></div></td><td>${StatusBadge(s.status)}</td></tr>`).join('')}</tbody></table></div></div>`, 'My Students'),
    'tutor-notes':        renderTutorNotes,
    'tutor-hours':        renderTutorHours,
    'tutor-messages':     () => renderShell(tutorNav(), `<div class="page-header"><div class="page-title">Messages</div></div><div class="card"><div class="empty-state"><i class="ti ti-message-2"></i><p>Your student conversations appear here. All messages are logged and visible to admins.</p></div></div>`, 'Messages'),
    'parent-dashboard':   renderParentDashboard,
    'parent-progress':    () => renderShell(parentNav(), `<div class="page-header"><div class="page-title">Lena\'s progress</div></div><div class="card">${DATA.skills.map(s=>`<div class="skill-row"><div class="skill-name">${s.name}</div><div class="skill-bar-wrap">${ProgressBar(s.pct,s.status==='mastered'?'teal':s.status==='progress'?'amber':'danger')}</div><div class="skill-pct">${s.pct}%</div>${s.status==='mastered'?Badge('Mastered','g'):s.status==='progress'?Badge('In progress','a'):Badge('Not started','r')}</div>`).join('')}</div>`, 'Progress'),
    'parent-sessions':    () => renderShell(parentNav(), `<div class="page-header"><div class="page-title">Sessions</div></div><div class="card">${DATA.sessions.map(s=>`<div class="session-card"><div class="session-time"><div class="session-time-val">${s.time.replace(' PM','')}</div><div class="session-time-day">${s.day}</div></div><div class="session-body"><div class="session-student">${s.subject}</div><div class="session-meta">${s.duration} · Online ${StatusBadge(s.status)}</div></div></div>`).join('')}</div>`, 'Sessions'),
    'parent-messages':    () => renderShell(parentNav(), `<div class="page-header"><div class="page-title">Messages</div></div><div class="card"><div class="empty-state"><i class="ti ti-message-2"></i><p>Message your child's tutor directly here.</p></div></div>`, 'Messages'),
    'admin-dashboard':    renderAdminDashboard,
    'admin-students':     renderAdminStudents,
    'admin-tutors':       renderAdminTutors,
    'admin-matching':     renderAdminMatching,
    'admin-approvals':    renderAdminApprovals,
    'admin-hours':        renderAdminHours,
    'terms':              renderTerms,
    'privacy':            renderPrivacy,
  };

  const fn = pageMap[State.page] || renderLanding;
  app.innerHTML = fn();

  // Inject modal
  if (State.modal === 'login') {
    document.body.insertAdjacentHTML('beforeend', renderLoginModal());
    const closeBtn = document.getElementById('close-login-btn');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      document.getElementById('login-modal') && document.getElementById('login-modal').remove();
      State.modal = null;
    });
  }

  // Responsive menu button
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn && window.innerWidth <= 900) menuBtn.style.display = 'flex';
}



// ---- STRIPE GRADIENT SHADER ----
function initGradientShader() {
  var canvas = document.getElementById('grad-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  var vsrc = [
    'attribute vec2 a_pos;',
    'void main(){gl_Position=vec4(a_pos,0.,1.);}',
  ].join('');

  // Warm stripe shader matching app palette
  // color1: cream #F2EDE6, color2: warm brown #6B4C3B, color3: muted teal #4A8C7A
  var fsrc = [
    'precision mediump float;',
    'uniform float u_time;',
    'uniform vec2 u_res;',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy/u_res;',
    '  float t = u_time * 0.18;',
    // Stripe pattern
    '  float stripe = sin((uv.x * 3.0 - uv.y * 1.5 + t) * 4.0) * 0.5 + 0.5;',
    '  float stripe2 = sin((uv.x * 2.0 + uv.y * 2.0 - t * 0.7) * 3.0) * 0.5 + 0.5;',
    '  float noise = fract(sin(uv.x*127.1+uv.y*311.7)*43758.5) * 0.06;',
    '  float blend = clamp(stripe * stripe2 + noise, 0., 1.);',
    // Warm cream base
    '  vec3 c1 = vec3(0.949, 0.929, 0.902);',
    // Warm brown
    '  vec3 c2 = vec3(0.878, 0.855, 0.820);',
    // Soft teal hint
    '  vec3 c3 = vec3(0.906, 0.925, 0.910);',
    '  vec3 col = mix(c1, mix(c2, c3, stripe2), blend * 0.55);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  function mkShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uTime = gl.getUniformLocation(prog, 'u_time');
  var uRes  = gl.getUniformLocation(prog, 'u_res');

  var start = performance.now();
  var animId = null;

  function draw() {
    // Only draw if canvas is in DOM (landing page)
    if (!document.getElementById('grad-canvas')) {
      cancelAnimationFrame(animId);
      return;
    }
    var t = (performance.now() - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(draw);
  }
  draw();
}

// ---- WORD ANIMATION ----
var wordPairs = [
  ['perfect', 'perfect'],
  ['ideal', 'ideal'],
  ['best', 'best'],
  ['right', 'right'],
];
var wordIdx = 0;

function startWordAnimation() {
  setInterval(function() {
    var w1 = document.getElementById('hero-word');
    var w2 = document.getElementById('hero-word-2');
    if (!w1 || !w2) return;
    wordIdx = (wordIdx + 1) % wordPairs.length;
    
    // Fade out
    w1.style.transition = 'opacity .25s ease, transform .25s ease';
    w2.style.transition = 'opacity .25s ease, transform .25s ease';
    w1.style.opacity = '0';
    w1.style.transform = 'translateY(-8px)';
    w2.style.opacity = '0';
    w2.style.transform = 'translateY(-8px)';
    
    setTimeout(function() {
      if (!document.getElementById('hero-word')) return;
      document.getElementById('hero-word').textContent = wordPairs[wordIdx][0];
      document.getElementById('hero-word-2').textContent = wordPairs[wordIdx][1];
      // Fade in
      w1 = document.getElementById('hero-word');
      w2 = document.getElementById('hero-word-2');
      w1.style.transform = 'translateY(8px)';
      w2.style.transform = 'translateY(8px)';
      setTimeout(function() {
        if (!document.getElementById('hero-word')) return;
        document.getElementById('hero-word').style.opacity = '1';
        document.getElementById('hero-word').style.transform = 'translateY(0)';
        document.getElementById('hero-word-2').style.opacity = '1';
        document.getElementById('hero-word-2').style.transform = 'translateY(0)';
      }, 20);
    }, 260);
  }, 2500);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  render();
  startWordAnimation();
  initGradientShader();
  // Close sidebar on mobile when clicking main content
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  });
});

// PWA service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
