/* ============================================================
   MyTurn 2.0 — Theme System (theme.js)
   ------------------------------------------------------------
   Handles dark / light mode toggle for every page.

   IMPORTANT: This script must be loaded in <head> (before body)
   to prevent a flash of the wrong theme on page load.

   HOW IT WORKS:
     1. On load: reads saved theme from localStorage
     2. Applies data-theme="dark" OR data-theme="light" on <html>
     3. CSS variables in style.css change based on [data-theme="dark"]
     4. Toggle button calls Theme.toggle()
     5. New preference is saved to localStorage
   ============================================================ */

const Theme = (function () {
  "use strict";

  const KEY = "ql-theme";   // localStorage key
  const HTML = document.documentElement;

  // Read saved preference, defaulting to "light"
  function getSaved() {
    return localStorage.getItem(KEY) || "light";
  }

  // Apply a theme ("light" or "dark") to <html> element
  function apply(theme) {
    HTML.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
    // Update all toggle buttons on the page
    updateButtons(theme);
  }

  // Switch between light and dark
  function toggle() {
    const current = HTML.getAttribute("data-theme") || "light";
    apply(current === "dark" ? "light" : "dark");
  }

  // Get current theme
  function current() {
    return HTML.getAttribute("data-theme") || "light";
  }

  // Update all theme toggle buttons to show the right icon
  function updateButtons(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title",      isDark ? "Switch to light mode" : "Switch to dark mode");
      // Sun icon for dark mode (click = go to light), Moon for light (click = go to dark)
      btn.innerHTML = isDark ? sunIcon() : moonIcon();
    });
  }

  // SVG Moon icon (shown in light mode — click to go dark)
  function moonIcon() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>`;
  }

  // SVG Sun icon (shown in dark mode — click to go light)
  function sunIcon() {
    return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>`;
  }

  // Initialize: apply saved theme immediately (called in <head>)
  function init() {
    apply(getSaved());
  }

  // Wire up toggle buttons after DOM is ready
  function wireDOMButtons() {
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.addEventListener("click", toggle);
    });
    // Ensure icons are correct after DOM load
    updateButtons(current());
  }

  return { init, toggle, current, wireDOMButtons, apply };
})();

// Apply theme immediately (script runs in <head> before body renders)
Theme.init();
