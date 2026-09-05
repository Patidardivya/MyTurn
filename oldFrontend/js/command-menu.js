/* ============================================================
   MyTurn 2.0 — Command Menu (command-menu.js)
   ------------------------------------------------------------
   A keyboard-first command palette triggered by Ctrl+K / Cmd+K.

   Features:
     - Fuzzy search through commands
     - Keyboard navigation (arrow keys, Enter, Escape)
     - Grouped commands: Navigation, Actions, Settings
     - Works on every page (public + dashboard)
     - Context-aware: shows role-specific commands

   USAGE:
     Press Ctrl+K (Win/Linux) or Cmd+K (Mac) anywhere.
     Type to filter. Arrow keys to navigate. Enter to run.
   ============================================================ */

const CommandMenu = (function () {
  "use strict";

  let overlayEl  = null;
  let inputEl    = null;
  let resultsEl  = null;
  let selectedIdx = -1;
  let filteredItems = [];

  /* ------------------------------------------------------------------
     COMMAND DEFINITIONS
     Each command: { label, group, icon, shortcut?, action }
     action can be: { href: "page.html" } or { fn: () => {} }
     ------------------------------------------------------------------ */
  function buildCommands() {
    const isLoggedIn = () => { try { return Auth.isLoggedIn(); } catch { return false; } };
    const role = () => { try { return Auth.currentUser()?.role || "GUEST"; } catch { return "GUEST"; } };

    // Navigation commands (always available)
    const navCommands = [
      {
        label: "Go to Home",
        group: "Navigate",
        icon: "home",
        action: { href: "index.html" }
      },
      {
        label: "Log In",
        group: "Navigate",
        icon: "user",
        action: { href: "login.html" }
      },
      {
        label: "Create Account",
        group: "Navigate",
        icon: "plus",
        action: { href: "register.html" }
      }
    ];

    // User commands (only when logged in as USER)
    const userCommands = [
      {
        label: "My Dashboard",
        group: "Navigate",
        icon: "home",
        action: { href: "user-dashboard.html" }
      },
      {
        label: "My Queue",
        group: "Navigate",
        icon: "ticket",
        action: { href: "queue.html" }
      },
      {
        label: "Appointments",
        group: "Navigate",
        icon: "calendar",
        action: { href: "appointments.html" }
      },
      {
        label: "Notifications",
        group: "Navigate",
        icon: "bell",
        action: { href: "notifications.html" }
      },
      {
        label: "Queue History",
        group: "Navigate",
        icon: "clock",
        action: { href: "history.html" }
      },
      {
        label: "My Profile",
        group: "Navigate",
        icon: "user",
        action: { href: "profile.html" }
      },
      {
        label: "Find a Service",
        group: "Navigate",
        icon: "search",
        action: { href: "user-dashboard.html#find" }
      }
    ];

    // Staff commands
    const staffCommands = [
      {
        label: "Queue Console",
        group: "Navigate",
        icon: "list",
        action: { href: "staff-dashboard.html" }
      },
      {
        label: "My Profile",
        group: "Navigate",
        icon: "user",
        action: { href: "profile.html" }
      }
    ];

    // Admin commands
    const adminCommands = [
      {
        label: "Admin Overview",
        group: "Navigate",
        icon: "chart",
        action: { href: "admin-dashboard.html" }
      },
      {
        label: "Branches",
        group: "Navigate",
        icon: "building",
        action: { href: "admin-dashboard.html#branches" }
      },
      {
        label: "Services",
        group: "Navigate",
        icon: "layers",
        action: { href: "admin-dashboard.html#services" }
      },
      {
        label: "Analytics",
        group: "Navigate",
        icon: "activity",
        action: { href: "admin-dashboard.html#analytics" }
      },
      {
        label: "My Profile",
        group: "Navigate",
        icon: "user",
        action: { href: "profile.html" }
      }
    ];

    // Action commands (context-aware)
    const actionCommands = [];

    if (isLoggedIn()) {
      actionCommands.push({
        label: "Open MyTurn Assistant",
        group: "Actions",
        icon: "zap",
        shortcut: "AI",
        action: { fn: () => { if (typeof Assistant !== "undefined") Assistant.open(); } }
      });
      actionCommands.push({
        label: "Log Out",
        group: "Actions",
        icon: "logout",
        action: { fn: () => { if (typeof Auth !== "undefined") Auth.logout(); } }
      });
    }

    // Settings commands (always available)
    const settingsCommands = [
      {
        label: "Toggle Dark Mode",
        group: "Settings",
        icon: "settings",
        shortcut: null,
        action: { fn: () => { if (typeof Theme !== "undefined") Theme.toggle(); } }
      }
    ];

    // Compose the right list based on role
    let cmds = [];
    if (!isLoggedIn()) {
      cmds = [...navCommands, ...actionCommands, ...settingsCommands];
    } else if (role() === "STAFF") {
      cmds = [...staffCommands, ...actionCommands, ...settingsCommands];
    } else if (role() === "ADMIN") {
      cmds = [...adminCommands, ...actionCommands, ...settingsCommands];
    } else {
      cmds = [...userCommands, ...actionCommands, ...settingsCommands];
    }

    return cmds;
  }

  /* ------------------------------------------------------------------
     ICON SVG — reuses Icons from app.js if available, otherwise inline
     ------------------------------------------------------------------ */
  function iconSVG(name) {
    if (typeof Icons !== "undefined") return Icons.get(name, 18);
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`;
  }

  /* ------------------------------------------------------------------
     FUZZY SEARCH
     Returns items whose labels include the query (case-insensitive).
     ------------------------------------------------------------------ */
  function filter(commands, query) {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(cmd => cmd.label.toLowerCase().includes(q) || cmd.group.toLowerCase().includes(q));
  }

  /* ------------------------------------------------------------------
     RENDER RESULTS
     ------------------------------------------------------------------ */
  function render(commands, query) {
    resultsEl.innerHTML = "";
    filteredItems = filter(commands, query);
    selectedIdx = filteredItems.length > 0 ? 0 : -1;

    if (filteredItems.length === 0) {
      resultsEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.88rem">No results for "<strong>${escapeHTML(query)}</strong>"</div>`;
      return;
    }

    // Group items
    const groups = {};
    filteredItems.forEach((item, idx) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push({ item, idx });
    });

    Object.entries(groups).forEach(([groupName, entries]) => {
      const label = document.createElement("div");
      label.className = "cmd-group-label";
      label.textContent = groupName;
      resultsEl.appendChild(label);

      entries.forEach(({ item, idx }) => {
        const el = document.createElement("div");
        el.className = "cmd-item" + (idx === selectedIdx ? " selected" : "");
        el.setAttribute("data-idx", idx);
        el.innerHTML = `
          <div class="cmd-item-icon">${iconSVG(item.icon)}</div>
          <div class="cmd-item-label">${highlightMatch(item.label, query)}</div>
          ${item.shortcut ? `<div class="cmd-item-shortcut">${item.shortcut}</div>` : ""}`;
        el.addEventListener("mouseenter", () => selectItem(idx));
        el.addEventListener("click", () => runItem(item));
        resultsEl.appendChild(el);
      });
    });
  }

  function highlightMatch(text, query) {
    if (!query.trim()) return escapeHTML(text);
    const re = new RegExp(`(${escapeRegExp(query.trim())})`, "gi");
    return escapeHTML(text).replace(re, "<mark style='background:var(--brand-50);color:var(--brand-700);border-radius:2px;'>$1</mark>");
  }

  function escapeHTML(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ------------------------------------------------------------------
     SELECTION STATE
     ------------------------------------------------------------------ */
  function selectItem(idx) {
    selectedIdx = idx;
    const items = resultsEl.querySelectorAll(".cmd-item");
    items.forEach((el, i) => el.classList.toggle("selected", i === idx));
    // Scroll selected into view
    const sel = resultsEl.querySelector(".cmd-item.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function moveSelection(delta) {
    if (filteredItems.length === 0) return;
    const next = Math.max(0, Math.min(filteredItems.length - 1, selectedIdx + delta));
    selectItem(next);
  }

  /* ------------------------------------------------------------------
     RUN A COMMAND
     ------------------------------------------------------------------ */
  function runItem(item) {
    close();
    if (!item) return;
    if (item.action.href) {
      window.location.href = item.action.href;
    } else if (typeof item.action.fn === "function") {
      item.action.fn();
    }
  }

  /* ------------------------------------------------------------------
     BUILD UI
     ------------------------------------------------------------------ */
  function buildUI() {
    overlayEl = document.createElement("div");
    overlayEl.className = "cmd-overlay";
    overlayEl.setAttribute("role", "dialog");
    overlayEl.setAttribute("aria-label", "Command menu");
    overlayEl.setAttribute("aria-modal", "true");

    overlayEl.innerHTML = `
      <div class="cmd-panel" role="listbox">
        <div class="cmd-input-row">
          ${iconSVG("search")}
          <input class="cmd-input" id="cmdInput" type="text" placeholder="Search commands…" autocomplete="off" spellcheck="false" aria-label="Search commands">
          <kbd class="cmd-kbd">ESC to close</kbd>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer">
          <kbd class="cmd-kbd">↑↓</kbd> navigate
          <kbd class="cmd-kbd">↵</kbd> select
          <kbd class="cmd-kbd">ESC</kbd> close
        </div>
      </div>`;

    document.body.appendChild(overlayEl);

    inputEl   = overlayEl.querySelector("#cmdInput");
    resultsEl = overlayEl.querySelector("#cmdResults");

    // Close on backdrop click
    overlayEl.addEventListener("click", e => {
      if (e.target === overlayEl) close();
    });

    // Input events
    inputEl.addEventListener("input", () => {
      const commands = buildCommands();
      render(commands, inputEl.value);
    });

    inputEl.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredItems[selectedIdx];
        if (item) runItem(item);
      }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });
  }

  /* ------------------------------------------------------------------
     OPEN / CLOSE
     ------------------------------------------------------------------ */
  function open() {
    if (!overlayEl) return;
    overlayEl.classList.add("open");
    inputEl.value = "";
    const commands = buildCommands();
    render(commands, "");
    setTimeout(() => inputEl.focus(), 50);
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.classList.remove("open");
  }

  function isOpen() {
    return overlayEl && overlayEl.classList.contains("open");
  }

  /* ------------------------------------------------------------------
     INIT — wire keyboard shortcut and build the DOM
     ------------------------------------------------------------------ */
  function init() {
    buildUI();

    // Keyboard shortcut: Ctrl+K or Cmd+K
    document.addEventListener("keydown", e => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key === "k";
      if (isCtrlK) {
        e.preventDefault();
        isOpen() ? close() : open();
      }
    });
  }

  return { init, open, close };
})();

// Auto-initialize
document.addEventListener("DOMContentLoaded", () => {
  CommandMenu.init();
});
