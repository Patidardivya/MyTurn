/* ============================================================
   MyTurn — Shared App Framework (app.js)
   ------------------------------------------------------------
   Loaded on EVERY page (after data.js, storage.js, auth.js).
   Provides the reusable pieces so individual pages stay small:

     • Utilities  : qs, qsa, el, esc, formatDate/Time, timeAgo, initials
     • Icons      : inline SVG set (no icon library needed)
     • Toast      : success / error / info notifications
     • Modal      : open/close + backdrop/ESC handling
     • Confirm    : promise-based confirmation dialog
     • Chrome     : role-aware sidebar + top bar for dashboards
     • Page router: runs window.Pages[<body data-page>] on load

   Simple pages (landing, login, register, history, notifications,
   profile) are controlled here. Bigger domains live in their own
   files: queue.js, appointments.js, staff.js, admin.js.
   ============================================================ */

/* ------------------------------------------------------------------
   1. TINY UTILITIES
   ------------------------------------------------------------------ */
const App = (function () {
  "use strict";

  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Create an element quickly: el('div', {class:'x'}, [child, 'text'])
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Escape user-provided text before putting it in innerHTML (XSS safety).
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  const initials = (name) =>
    (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  function formatDate(iso, opts) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", opts || { day: "2-digit", month: "short", year: "numeric" });
  }
  const formatDateShort = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatDateTime = (iso) => `${formatDate(iso)} · ${formatTime(iso)}`;

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    const days = Math.round(h / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return formatDate(iso);
  }

  // minutes -> "1 h 5 min" / "28 min"
  function formatMins(mins) {
    mins = Math.max(0, Math.round(mins));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  return { qs, qsa, el, esc, initials, formatDate, formatDateShort, formatTime, formatDateTime, timeAgo, formatMins };
})();

/* ------------------------------------------------------------------
   2. ICONS — small inline SVG set (stroke = currentColor)
   Keeps markup clean and avoids pulling in an icon library.
   ------------------------------------------------------------------ */
const Icons = (function () {
  const P = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    home:      `<path ${P} d="M3 10.5 12 3l9 7.5"/><path ${P} d="M5 9.5V21h14V9.5"/>`,
    search:    `<circle cx="11" cy="11" r="7" ${P}/><path ${P} d="m21 21-4.3-4.3"/>`,
    ticket:    `<path ${P} d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path ${P} d="M15 6v12"/>`,
    calendar:  `<rect x="3" y="4.5" width="18" height="16" rx="2" ${P}/><path ${P} d="M3 9h18M8 3v3M16 3v3"/>`,
    clock:     `<circle cx="12" cy="12" r="8.5" ${P}/><path ${P} d="M12 8v4l3 2"/>`,
    bell:      `<path ${P} d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path ${P} d="M10.5 20a1.8 1.8 0 0 0 3 0"/>`,
    user:      `<circle cx="12" cy="8" r="3.5" ${P}/><path ${P} d="M5 20a7 7 0 0 1 14 0"/>`,
    users:     `<circle cx="9" cy="8" r="3.2" ${P}/><path ${P} d="M3 19a6 6 0 0 1 12 0"/><path ${P} d="M16 5.5a3.2 3.2 0 0 1 0 6M21 19a6 6 0 0 0-4-5.7"/>`,
    logout:    `<path ${P} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path ${P} d="M10 8 6 12l4 4M6 12h10"/>`,
    list:      `<path ${P} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
    chart:     `<path ${P} d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`,
    building:  `<rect x="4" y="3" width="16" height="18" rx="1.5" ${P}/><path ${P} d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>`,
    layers:    `<path ${P} d="m12 3 9 5-9 5-9-5 9-5Z"/><path ${P} d="m3 13 9 5 9-5M3 8v0"/>`,
    activity:  `<path ${P} d="M3 12h4l3 8 4-16 3 8h4"/>`,
    menu:      `<path ${P} d="M4 6h16M4 12h16M4 18h16"/>`,
    x:         `<path ${P} d="M6 6l12 12M18 6 6 18"/>`,
    check:     `<path ${P} d="m5 12 5 5 9-11"/>`,
    checkCircle:`<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="m8 12 3 3 5-6"/>`,
    xCircle:   `<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="m9 9 6 6M15 9l-6 6"/>`,
    alert:     `<path ${P} d="M12 3 2 20h20L12 3Z"/><path ${P} d="M12 9v5M12 17h.01"/>`,
    info:      `<circle cx="12" cy="12" r="9" ${P}/><path ${P} d="M12 11v5M12 8h.01"/>`,
    plus:      `<path ${P} d="M12 5v14M5 12h14"/>`,
    edit:      `<path ${P} d="M4 20h4L19 9l-4-4L4 16v4Z"/><path ${P} d="m14 6 4 4"/>`,
    trash:     `<path ${P} d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>`,
    phone:     `<path ${P} d="M4 5c0 9 6 15 15 15l1-4-5-2-2 2a11 11 0 0 1-5-5l2-2-2-5-4 1Z"/>`,
    mail:      `<rect x="3" y="5" width="18" height="14" rx="2" ${P}/><path ${P} d="m4 7 8 6 8-6"/>`,
    lock:      `<rect x="5" y="11" width="14" height="9" rx="2" ${P}/><path ${P} d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
    mapPin:    `<path ${P} d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5" ${P}/>`,
    chevronRight:`<path ${P} d="m9 6 6 6-6 6"/>`,
    arrowRight:`<path ${P} d="M5 12h14M13 6l6 6-6 6"/>`,
    play:      `<path ${P} d="M7 5.5v13l11-6.5-11-6.5Z"/>`,
    skip:      `<path ${P} d="M6 5v14l9-7-9-7Z"/><path ${P} d="M18 5v14"/>`,
    rotate:    `<path ${P} d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path ${P} d="M3 3v5h5"/>`,
    refresh:   `<path ${P} d="M4 12a8 8 0 0 1 13.7-5.7L20 8"/><path ${P} d="M20 4v4h-4"/><path ${P} d="M20 12a8 8 0 0 1-13.7 5.7L4 16"/><path ${P} d="M4 20v-4h4"/>`,
    shield:    `<path ${P} d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path ${P} d="m9 12 2 2 4-4"/>`,
    zap:       `<path ${P} d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"/>`,
    eye:       `<path ${P} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3" ${P}/>`,
    eyeOff:    `<path ${P} d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.3 6.3A17 17 0 0 0 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.5"/>`,
    star:      `<path ${P} d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>`,
    grid:      `<rect x="3" y="3" width="7" height="7" rx="1.5" ${P}/><rect x="14" y="3" width="7" height="7" rx="1.5" ${P}/><rect x="3" y="14" width="7" height="7" rx="1.5" ${P}/><rect x="14" y="14" width="7" height="7" rx="1.5" ${P}/>`,
    settings:  `<circle cx="12" cy="12" r="3" ${P}/><path ${P} d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L4.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z"/>`
  };
  function get(name, size = 20) {
    const body = paths[name] || paths.info;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;
  }
  return { get };
})();

/* ------------------------------------------------------------------
   3. TOASTS
   ------------------------------------------------------------------ */
const Toast = (function () {
  function container() {
    let c = document.getElementById("ql-toasts");
    if (!c) {
      c = App.el("div", { class: "toast-container", id: "ql-toasts", "aria-live": "polite", role: "status" });
      document.body.appendChild(c);
    }
    return c;
  }
  function show({ type = "info", title = "", message = "", duration = 3800 }) {
    const iconName = type === "success" ? "checkCircle" : type === "error" ? "xCircle" : "info";
    const toast = App.el("div", { class: `toast toast-${type}` });
    toast.innerHTML = `
      <span class="toast-icon">${Icons.get(iconName, 22)}</span>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${App.esc(title)}</div>` : ""}
        ${message ? `<div class="toast-msg">${App.esc(message)}</div>` : ""}
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>`;
    const remove = () => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 200);
    };
    toast.querySelector(".toast-close").addEventListener("click", remove);
    container().appendChild(toast);
    if (duration) setTimeout(remove, duration);
    return toast;
  }
  return {
    show,
    success: (title, message) => show({ type: "success", title, message }),
    error:   (title, message) => show({ type: "error",   title, message }),
    info:    (title, message) => show({ type: "info",    title, message })
  };
})();

/* ------------------------------------------------------------------
   4. MODALS  (open/close, backdrop click, ESC)
   ------------------------------------------------------------------ */
const Modal = (function () {
  function open(elOrId) {
    const overlay = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!overlay) return;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    const focusable = overlay.querySelector("input, select, textarea, button");
    if (focusable) setTimeout(() => focusable.focus(), 60);
  }
  function close(elOrId) {
    const overlay = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
    if (!overlay) return;
    overlay.classList.remove("open");
    if (!document.querySelector(".modal-overlay.open")) document.body.style.overflow = "";
  }
  function closeAll() { App.qsa(".modal-overlay.open").forEach(o => close(o)); }

  // Global handlers: click on backdrop or [data-close-modal], and ESC key.
  document.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal-overlay")) close(e.target);
    const closer = e.target.closest && e.target.closest("[data-close-modal]");
    if (closer) { const ov = closer.closest(".modal-overlay"); if (ov) close(ov); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  return { open, close, closeAll };
})();

/* ------------------------------------------------------------------
   5. CONFIRM DIALOG (promise-based)
   Usage:  if (await Confirm({title, message, danger:true})) { ... }
   ------------------------------------------------------------------ */
function Confirm({ title = "Are you sure?", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById("ql-confirm");
    if (!overlay) {
      overlay = App.el("div", { class: "modal-overlay", id: "ql-confirm" });
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ql-confirm-title">
          <div class="modal-header">
            <h3 id="ql-confirm-title"></h3>
            <button class="modal-close" data-close-modal aria-label="Close">&times;</button>
          </div>
          <div class="modal-body"><p id="ql-confirm-msg" style="color:var(--text-muted)"></p></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="ql-confirm-cancel"></button>
            <button class="btn" id="ql-confirm-ok"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector("#ql-confirm-title").textContent = title;
    overlay.querySelector("#ql-confirm-msg").textContent = message;
    const okBtn = overlay.querySelector("#ql-confirm-ok");
    const cancelBtn = overlay.querySelector("#ql-confirm-cancel");
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    okBtn.className = "btn " + (danger ? "btn-danger" : "");

    function done(result) {
      Modal.close(overlay);
      okBtn.replaceWith(okBtn.cloneNode(true));       // clear listeners
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      resolve(result);
    }
    okBtn.addEventListener("click", () => done(true));
    cancelBtn.addEventListener("click", () => done(false));
    overlay.querySelector(".modal-close").addEventListener("click", () => done(false), { once: true });
    Modal.open(overlay);
  });
}

/* ------------------------------------------------------------------
   6. CHROME — role-aware sidebar + top bar for dashboard pages
   ------------------------------------------------------------------ */
const Chrome = (function () {
  // Menu definitions per role. Each item: {key,label,icon,href|action,badge?}
  const MENUS = {
    USER: [
      { group: "Menu", items: [
        { key: "user-dashboard", label: "Dashboard",     icon: "home",     href: "user-dashboard.html" },
        { key: "find",           label: "Find Services",  icon: "search",   href: "user-dashboard.html#find" },
        { key: "queue",          label: "My Queue",       icon: "ticket",   href: "queue.html" },
        { key: "appointments",   label: "Appointments",   icon: "calendar", href: "appointments.html" },
        { key: "history",        label: "History",        icon: "clock",    href: "history.html" },
        { key: "notifications",  label: "Notifications",  icon: "bell",     href: "notifications.html", badge: "notif" }
      ]},
      { group: "Account", items: [
        { key: "profile", label: "Profile", icon: "user",   href: "profile.html" },
        { key: "logout",  label: "Logout",  icon: "logout", action: "logout" }
      ]}
    ],
    STAFF: [
      { group: "Operations", items: [
        { key: "staff-dashboard", label: "Queue Console", icon: "list", href: "staff-dashboard.html" }
      ]},
      { group: "Account", items: [
        { key: "profile", label: "Profile", icon: "user",   href: "profile.html" },
        { key: "logout",  label: "Logout",  icon: "logout", action: "logout" }
      ]}
    ],
    ADMIN: [
      { group: "Manage", items: [
        { key: "admin-dashboard", label: "Overview",  icon: "chart",    href: "admin-dashboard.html" },
        { key: "branches",        label: "Branches",  icon: "building", href: "admin-dashboard.html#branches" },
        { key: "services",        label: "Services",  icon: "layers",   href: "admin-dashboard.html#services" },
        { key: "analytics",       label: "Analytics", icon: "activity", href: "admin-dashboard.html#analytics" }
      ]},
      { group: "Account", items: [
        { key: "profile", label: "Profile", icon: "user",   href: "profile.html" },
        { key: "logout",  label: "Logout",  icon: "logout", action: "logout" }
      ]}
    ]
  };

  function mount({ page, title = "", subtitle = "", active }) {
    const user = Auth.currentUser();
    if (!user) return;
    active = active || page;
    const menu = MENUS[user.role] || MENUS.USER;
    const unread = Store.unreadCount(user.id);

    /* ---- Sidebar ---- */
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      let html = `
        <a class="sidebar-brand" href="${Auth.dashboardFor(user.role)}">
          <span class="brand-mark">MT</span> MyTurn
        </a>
        <nav class="sidebar-scroll" aria-label="Primary">`;
      menu.forEach(group => {
        html += `<div class="nav-group-label">${App.esc(group.group)}</div>`;
        group.items.forEach(item => {
          const isActive = item.key === active ? " active" : "";
          const badge = item.badge === "notif" && unread ? `<span class="nav-badge">${unread}</span>` : "";
          const attrs = item.action ? `data-action="${item.action}"` : `href="${item.href}"`;
          const tag = item.action ? "button" : "a";
          html += `<${tag} class="nav-item${isActive}" ${attrs}>
              ${Icons.get(item.icon, 20)}<span>${App.esc(item.label)}</span>${badge}
            </${tag}>`;
        });
      });
      html += `</nav>
        <div class="sidebar-footer">
          <a class="side-user" href="profile.html">
            <span class="avatar">${App.esc(App.initials(user.name))}</span>
            <span style="min-width:0">
              <span class="su-name">${App.esc(user.name)}</span>
              <span class="su-role">${App.esc(user.role)}</span>
            </span>
          </a>
        </div>`;
      sidebar.innerHTML = html;
    }

    /* ---- Top bar ---- */
    const topbar = document.getElementById("topbar");
    if (topbar) {
      // Notification bell with unread count badge (USER role only)
      const bellHtml = user.role === "USER" ? `
        <a class="icon-btn" href="notifications.html" aria-label="Notifications${unread ? `: ${unread} unread` : ""}">
          ${Icons.get("bell", 20)}
          ${unread ? `<span class="notif-count" aria-hidden="true">${unread > 9 ? "9+" : unread}</span>` : ""}
        </a>` : "";

      // Theme toggle button — works on all dashboard pages
      const themeBtn = `
        <button class="theme-toggle icon-btn" data-theme-toggle
          aria-label="Toggle dark mode" title="Toggle dark mode">
        </button>`;

      topbar.innerHTML = `
        <button class="icon-btn sidebar-toggle" id="sidebarToggle" aria-label="Open menu">${Icons.get("menu", 20)}</button>
        <div>
          <div class="page-title">${App.esc(title)}</div>
        </div>
        <div class="spacer"></div>
        ${user.role === "USER" ? `<div class="topbar-search">${Icons.get("search",18)}<input type="search" placeholder="Search services, branches…" aria-label="Search" id="topSearch"></div>` : ""}
        ${bellHtml}
        ${themeBtn}
        <a class="avatar avatar-sm" href="profile.html" title="${App.esc(user.name)}" aria-label="Your profile">${App.esc(App.initials(user.name))}</a>`;

      // Wire theme toggle buttons after topbar renders
      if (typeof Theme !== "undefined") Theme.wireDOMButtons();
    }

    wireChrome();
  }

  function wireChrome() {
    // Sidebar drawer toggle (mobile)
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebarToggle");
    let backdrop = document.getElementById("sidebarBackdrop");
    if (!backdrop && sidebar) {
      backdrop = App.el("div", { class: "sidebar-backdrop", id: "sidebarBackdrop" });
      document.body.appendChild(backdrop);
    }
    const openSidebar  = () => { sidebar.classList.add("open"); backdrop.classList.add("open"); };
    const closeSidebar = () => { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };
    if (toggle) toggle.addEventListener("click", openSidebar);
    if (backdrop) backdrop.addEventListener("click", closeSidebar);
    // Close the drawer after tapping a link (mobile)
    App.qsa(".nav-item[href]").forEach(a => a.addEventListener("click", closeSidebar));

    // Logout buttons (works in sidebar or anywhere with data-action="logout")
    App.qsa('[data-action="logout"]').forEach(btn =>
      btn.addEventListener("click", async () => {
        const ok = await Confirm({ title: "Log out?", message: "You will be returned to the login screen.", confirmText: "Log out" });
        if (ok) Auth.logout();
      })
    );

    // Top search is a demo affordance — guide the user to Find Services.
    const search = document.getElementById("topSearch");
    if (search) search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.location.href = "user-dashboard.html#find";
    });
  }

  return { mount };
})();

/* ------------------------------------------------------------------
   7. PUBLIC NAVBAR (landing page) mobile toggle
   ------------------------------------------------------------------ */
function initPublicNav() {
  const toggle = App.qs(".nav-toggle");
  const links = App.qs(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    App.qsa(".nav-links a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }
}
function setYear() { App.qsa("[data-year]").forEach(n => (n.textContent = new Date().getFullYear())); }

/* ------------------------------------------------------------------
   8. SIMPLE PAGE CONTROLLERS
   (bigger pages register themselves into window.Pages from their
    own files: queue.js / appointments.js / staff.js / admin.js)
   ------------------------------------------------------------------ */
window.Pages = window.Pages || {};

/* ---- Landing page: send CTA to the right place ---- */
window.Pages["landing"] = function () {
  App.qsa("[data-cta-primary]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = Auth.isLoggedIn() ? Auth.dashboardFor(Auth.currentUser().role) : "login.html";
    });
  });
};

/* ---- Login page ---- */
window.Pages["login"] = function () {
  const form = App.qs("#loginForm");
  if (!form) return;

  // "Fill" links in the demo box populate the form for quick testing.
  App.qsa("[data-demo-fill]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const acct = Auth.demoAccounts.find(a => a.role === link.getAttribute("data-demo-fill"));
      if (acct) { form.email.value = acct.email; form.password.value = acct.password; }
    });
  });

  // Show/hide password
  wirePasswordToggles(form);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const email = form.email.value, password = form.password.value;

    // Simple front-end validation before "calling the API".
    if (!Auth.isValidEmail(email)) { Toast.error("Invalid email", "Please enter a valid email address."); return; }
    if (!password) { Toast.error("Password required", "Please enter your password."); return; }

    // Simulate a brief network call for a realistic loading state.
    setLoading(btn, true, "Signing in…");
    setTimeout(() => {
      const res = Auth.login(email, password);
      if (res.ok) {
        Toast.success("Welcome back", `Signed in as ${res.user.name}.`);
        setTimeout(() => (window.location.href = Auth.dashboardFor(res.user.role)), 500);
      } else {
        setLoading(btn, false);
        Toast.error("Login failed", res.error);
      }
    }, 550);
  });
};

/* ---- Register page ---- */
window.Pages["register"] = function () {
  const form = App.qs("#registerForm");
  if (!form) return;
  wirePasswordToggles(form);

  // Live password strength meter
  const pw = form.password;
  const meter = App.qs("#pwMeter i");
  if (pw && meter) pw.addEventListener("input", () => {
    const s = passwordStrength(pw.value);
    meter.style.width = ["8%", "30%", "60%", "100%"][s.score] || "8%";
    meter.style.background = ["#dc2626", "#d97706", "#eab308", "#16a34a"][s.score] || "#dc2626";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    clearFieldErrors(form);

    const payload = {
      name: form.name.value, email: form.email.value, phone: form.phone.value,
      password: form.password.value, confirmPassword: form.confirmPassword.value
    };

    setLoading(btn, true, "Creating account…");
    setTimeout(() => {
      const res = Auth.register(payload);
      if (res.ok) {
        Toast.success("Account created", "Welcome to MyTurn!");
        setTimeout(() => (window.location.href = Auth.dashboardFor(res.user.role)), 500);
      } else {
        setLoading(btn, false);
        showFieldErrors(form, res.fieldErrors);
        Toast.error("Please fix the errors", "Some fields need your attention.");
      }
    }, 600);
  });
};

/* ---- History page ---- */
window.Pages["history"] = function () {
  const user = Auth.currentUser();
  const body = App.qs("#historyBody");
  const empty = App.qs("#historyEmpty");
  const segmented = App.qs("#historyFilter");
  if (!body) return;

  let filter = "all";
  const rows = Store.getUserHistory(user.id);

  function statusBadge(status) {
    const map = { completed: "badge-success", cancelled: "badge-danger", "no-show": "badge-warning", skipped: "badge-info" };
    const label = status === "no-show" ? "No-show" : status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="badge ${map[status] || ""}">${label}</span>`;
  }

  function render() {
    const list = rows.filter(t => filter === "all" ? true : t.status === filter);
    body.innerHTML = "";
    empty.classList.toggle("hidden", list.length > 0);
    document.getElementById("historyTable").classList.toggle("hidden", list.length === 0);

    list.forEach(t => {
      const service = Store.getService(t.serviceId);
      const branch = Store.getBranch(t.branchId);
      const tr = App.el("tr");
      tr.innerHTML = `
        <td data-label="Token"><span class="t-token">#${App.esc(t.code)}</span></td>
        <td data-label="Service">${App.esc(service ? service.name : "—")}<div class="text-subtle" style="font-size:.8rem">${App.esc(branch ? branch.name : "")}</div></td>
        <td data-label="Date">${App.formatDate(t.issuedAt)}</td>
        <td data-label="Waiting" class="num">${t.waitMinutes != null ? t.waitMinutes + " min" : "—"}</td>
        <td data-label="Service time" class="num">${t.serviceMinutes ? t.serviceMinutes + " min" : "—"}</td>
        <td data-label="Status">${statusBadge(t.status)}</td>`;
      body.appendChild(tr);
    });
  }

  if (segmented) segmented.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    filter = btn.getAttribute("data-filter");
    App.qsa("button", segmented).forEach(b => b.classList.toggle("active", b === btn));
    render();
  });
  render();
};

/* ---- Notifications page ---- */
window.Pages["notifications"] = function () {
  const user = Auth.currentUser();
  const listEl = App.qs("#notifList");
  const empty = App.qs("#notifEmpty");
  if (!listEl) return;

  function iconFor(type) {
    return { queue: "ticket", warning: "alert", appt: "calendar", success: "checkCircle" }[type] || "bell";
  }
  function render() {
    const items = Store.getUserNotifications(user.id);
    const unread = items.filter(n => !n.read).length;
    const markAllBtn = App.qs("#markAllRead");
    if (markAllBtn) markAllBtn.disabled = unread === 0;
    App.qs("#notifUnreadLabel").textContent = unread ? `${unread} unread` : "All caught up";

    listEl.innerHTML = "";
    empty.classList.toggle("hidden", items.length > 0);
    items.forEach(n => {
      const row = App.el("div", { class: "notif" + (n.read ? "" : " unread") });
      row.innerHTML = `
        <span class="n-icon">${Icons.get(iconFor(n.type), 20)}</span>
        <div class="n-body">
          <div class="row-between"><span class="n-title">${App.esc(n.title)}</span><span class="n-time">${App.timeAgo(n.createdAt)}</span></div>
          <div class="n-text">${App.esc(n.message)}</div>
        </div>
        ${n.read ? "" : `<button class="btn btn-ghost btn-sm" data-read="${n.id}">Mark read</button>`}`;
      listEl.appendChild(row);
    });
    App.qsa("[data-read]", listEl).forEach(btn =>
      btn.addEventListener("click", () => { markRead(Number(btn.getAttribute("data-read"))); })
    );
  }
  function markRead(id) {
    Store.update(data => { const n = data.notifications.find(x => x.id === id); if (n) n.read = true; });
    render();
    Toast.info("Marked as read");
  }
  const markAllBtn = App.qs("#markAllRead");
  if (markAllBtn) markAllBtn.addEventListener("click", () => {
    Store.update(data => data.notifications.forEach(n => { if (n.userId === user.id) n.read = true; }));
    render();
    Toast.success("All notifications marked as read");
  });
  render();
};

/* ---- Profile page ---- */
window.Pages["profile"] = function () {
  const user = Auth.currentUser();
  const fill = () => {
    const u = Auth.currentUser();
    App.qs("#pfAvatar").textContent = App.initials(u.name);
    App.qs("#pfName").textContent = u.name;
    App.qs("#pfRole").textContent = u.role;
    App.qs("#pfNameVal").textContent = u.name;
    App.qs("#pfEmailVal").textContent = u.email;
    App.qs("#pfPhoneVal").textContent = u.phone || "—";
    App.qs("#pfRoleVal").textContent = u.role;
    App.qs("#pfMemberVal").textContent = App.formatDate(u.createdAt);
  };
  fill();

  // Edit profile modal
  const editBtn = App.qs("#editProfileBtn");
  const editForm = App.qs("#editProfileForm");
  if (editBtn) editBtn.addEventListener("click", () => {
    const u = Auth.currentUser();
    editForm.name.value = u.name; editForm.email.value = u.email; editForm.phone.value = u.phone || "";
    Modal.open("editProfileModal");
  });
  if (editForm) editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = editForm.name.value.trim(), phone = editForm.phone.value.trim();
    if (name.length < 2) { Toast.error("Invalid name", "Please enter your full name."); return; }
    Auth.updateProfile({ name, phone });
    Modal.close("editProfileModal");
    fill();
    Toast.success("Profile updated", "Your details were saved.");
  });

  // Change password modal (DEMO — just validates and confirms)
  const pwBtn = App.qs("#changePwBtn");
  const pwForm = App.qs("#changePwForm");
  if (pwBtn) pwBtn.addEventListener("click", () => { pwForm.reset(); wirePasswordToggles(pwForm); Modal.open("changePwModal"); });
  if (pwForm) pwForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if ((pwForm.newPassword.value || "").length < 6) { Toast.error("Weak password", "Use at least 6 characters."); return; }
    if (pwForm.newPassword.value !== pwForm.confirmPassword.value) { Toast.error("Mismatch", "New passwords do not match."); return; }
    Modal.close("changePwModal");
    Toast.success("Password changed", "Your password was updated (demo).");
  });

  // Reset demo data
  const resetBtn = App.qs("#resetDemoBtn");
  if (resetBtn) resetBtn.addEventListener("click", async () => {
    const ok = await Confirm({ title: "Reset demo data?", message: "This restores all sample branches, queues and history to their original state.", confirmText: "Reset", danger: true });
    if (ok) { Store.resetDemo(); Toast.success("Demo data reset"); setTimeout(() => location.reload(), 700); }
  });
};

/* ------------------------------------------------------------------
   9. SHARED FORM HELPERS
   ------------------------------------------------------------------ */
function setLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText || "Please wait…"}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
}
function wirePasswordToggles(scope) {
  App.qsa(".input-affix[data-toggle-pw]", scope).forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = Icons.get(show ? "eyeOff" : "eye", 18);
    });
  });
}
function passwordStrength(v) {
  let score = 0;
  if (v.length >= 6) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v) && v.length >= 8) score++;
  return { score: Math.min(score, 3) };
}
function clearFieldErrors(form) {
  App.qsa(".form-group.has-error", form).forEach(g => g.classList.remove("has-error"));
}
function showFieldErrors(form, errors) {
  Object.entries(errors || {}).forEach(([field, msg]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;
    const group = input.closest(".form-group");
    if (group) {
      group.classList.add("has-error");
      const err = group.querySelector(".form-error");
      if (err) err.textContent = msg;
    }
  });
}

/* ------------------------------------------------------------------
   10. BOOTSTRAP — runs on every page
   ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const page = body.dataset.page;

  // Route guard for protected pages (data-roles="USER" etc.)
  if (body.dataset.roles) {
    const user = Auth.requireAuth(body.dataset.roles.split(",").map(s => s.trim()));
    if (!user) return; // requireAuth already redirected
  }

  // Mount dashboard chrome if this page has a sidebar shell.
  if (document.getElementById("sidebar")) {
    Chrome.mount({
      page,
      title: body.dataset.title || "",
      subtitle: body.dataset.subtitle || "",
      active: body.dataset.active || page
    });
  }

  initPublicNav();
  setYear();

  // Wire theme toggle buttons on this page (if theme.js is loaded)
  if (typeof Theme !== "undefined") Theme.wireDOMButtons();

  // Run the page-specific controller, if one is registered.
  if (page && typeof window.Pages[page] === "function") {
    try { window.Pages[page](); }
    catch (err) { console.error(`MyTurn: error initialising page "${page}"`, err); }
  }
});
