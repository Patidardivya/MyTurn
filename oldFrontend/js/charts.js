/* ============================================================
   MyTurn 2.0 — Charts Module (charts.js)
   ------------------------------------------------------------
   Shared Chart.js initialisation, theming, and demo data.
   Loaded on staff-dashboard and admin-dashboard pages.

   Requires: Chart.js loaded from CDN before this file.
   ============================================================ */

const Charts = (function () {
  "use strict";

  /* ---- Detect current theme ---- */
  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  /* ---- Shared color palette ---- */
  function palette() {
    const dark = isDark();
    return {
      text:       dark ? "#94a3b8" : "#64748b",
      textStrong: dark ? "#f1f5f9" : "#0f172a",
      grid:       dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      surface:    dark ? "#111827" : "#ffffff",
      brand:      "#6366f1",
      violet:     "#7c3aed",
      cyan:       "#06b6d4",
      green:      "#16a34a",
      amber:      "#d97706",
      red:        "#dc2626",
      gradient1:  "rgba(99,102,241,0.8)",
      gradient2:  "rgba(124,58,237,0.8)",
    };
  }

  /* ---- Default global Chart.js options ---- */
  function globalDefaults() {
    const p = palette();
    Chart.defaults.color = p.text;
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size   = 12;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = p.surface;
    Chart.defaults.plugins.tooltip.titleColor = p.textStrong;
    Chart.defaults.plugins.tooltip.bodyColor  = p.text;
    Chart.defaults.plugins.tooltip.borderColor = p.grid;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  /* ---- Create a gradient fill for bar/line charts ---- */
  function createGradient(ctx, colorTop, colorBottom) {
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0,   colorTop);
    grad.addColorStop(1,   colorBottom);
    return grad;
  }

  /* ---- STAFF: Daily Visitors Bar Chart ---- */
  function renderDailyVisitors(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();
    const grad = createGradient(ctx, p.gradient1, "rgba(99,102,241,0.1)");

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels:   data.map(d => d.day),
        datasets: [{
          label: "Visitors",
          data:  data.map(d => d.count),
          backgroundColor: grad,
          borderColor:     p.brand,
          borderWidth:     2,
          borderRadius:    6,
          borderSkipped:   false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} visitors` } }
        },
        scales: {
          x: { grid: { color: p.grid }, ticks: { color: p.text } },
          y: { grid: { color: p.grid }, ticks: { color: p.text }, beginAtZero: true }
        }
      }
    });
  }

  /* ---- STAFF: Peak Hours Bar Chart ---- */
  function renderPeakHours(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();
    const grad = createGradient(ctx, "rgba(217,119,6,0.85)", "rgba(217,119,6,0.1)");

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels:   data.map(d => d.hour),
        datasets: [{
          label: "Tokens",
          data:  data.map(d => d.count),
          backgroundColor: grad,
          borderColor:     p.amber,
          borderWidth:     2,
          borderRadius:    6,
          borderSkipped:   false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} tokens` } }
        },
        scales: {
          x: { grid: { color: p.grid }, ticks: { color: p.text } },
          y: { grid: { color: p.grid }, ticks: { color: p.text }, beginAtZero: true }
        }
      }
    });
  }

  /* ---- STAFF / ADMIN: Service Distribution Doughnut ---- */
  function renderServiceDoughnut(canvasId, totals) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();

    const labels  = ["Completed", "Cancelled", "No-shows"];
    const values  = [totals.completed, totals.cancelled, totals.noShows];
    const colors  = [p.green, p.red, p.amber];

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: colors,
          borderColor:     p.surface,
          borderWidth:     3,
          hoverOffset:     6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { color: p.text, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = values.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /* ---- ADMIN: Average Wait Time Line Chart ---- */
  function renderAvgWaitLine(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();
    const grad = createGradient(ctx, "rgba(6,182,212,0.35)", "rgba(6,182,212,0.02)");

    return new Chart(ctx, {
      type: "line",
      data: {
        labels:   data.map(d => d.day),
        datasets: [{
          label: "Avg Wait (min)",
          data:  data.map(d => d.avgWait),
          fill:          true,
          backgroundColor: grad,
          borderColor:     p.cyan,
          borderWidth:     2.5,
          pointBackgroundColor: p.cyan,
          pointRadius:     4,
          pointHoverRadius: 6,
          tension:         0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} min avg wait` } }
        },
        scales: {
          x: { grid: { color: p.grid }, ticks: { color: p.text } },
          y: { grid: { color: p.grid }, ticks: { color: p.text, callback: v => v + " m" }, beginAtZero: true }
        }
      }
    });
  }

  /* ---- ADMIN: Popular Services Horizontal Bar ---- */
  function renderPopularServices(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();

    const colors = [p.brand, p.violet, p.cyan, p.amber, p.green];

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels:   data.map(d => d.name),
        datasets: [{
          label: "Tokens",
          data:  data.map(d => d.count),
          backgroundColor: data.map((_, i) => colors[i % colors.length] + "cc"),
          borderColor:     data.map((_, i) => colors[i % colors.length]),
          borderWidth:     2,
          borderRadius:    6,
          borderSkipped:   false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} tokens` } }
        },
        scales: {
          x: { grid: { color: p.grid }, ticks: { color: p.text }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { color: p.text } }
        }
      }
    });
  }

  /* ---- USER: Queue Progress Doughnut (minimal) ---- */
  function renderQueueProgress(canvasId, served, total) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const p   = palette();
    const pct = total > 0 ? Math.round((served / total) * 100) : 0;
    const remaining = 100 - pct;

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [pct, remaining],
          backgroundColor: [p.brand, isDark() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"],
          borderWidth: 0,
          hoverOffset: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "78%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { animateRotate: true, duration: 1000 }
      }
    });
  }

  /* ---- Destroy & recreate all charts on theme change ---- */
  let _instances = [];
  function track(chart) { _instances.push(chart); return chart; }
  function destroyAll() { _instances.forEach(c => { try { c.destroy(); } catch(e) {} }); _instances = []; }

  return {
    isDark,
    palette,
    globalDefaults,
    renderDailyVisitors,
    renderPeakHours,
    renderServiceDoughnut,
    renderAvgWaitLine,
    renderPopularServices,
    renderQueueProgress,
    track,
    destroyAll,
  };
})();
