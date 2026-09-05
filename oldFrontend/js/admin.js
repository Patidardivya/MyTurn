/* ============================================================
   MyTurn — Admin Dashboard (admin.js)
   ------------------------------------------------------------
   Controller for admin-dashboard.html:
     • Overview KPIs (from the analytics table)
     • Lightweight charts drawn with pure CSS/JS (no chart library)
     • Branch management  — add / remove branches
     • Service management — add / edit / remove services

   Charts are intentionally simple: in production these numbers
   would come from SQL aggregates, but the render code stays the
   same because it only reads Store.getAnalytics().
   ============================================================ */
window.Pages["admin-dashboard"] = function () {

  renderStats();
  renderCharts();
  renderBranches();
  renderServices();
  wireBranchModal();
  wireServiceModal();

  // Keep management lists fresh if data changes.
  document.addEventListener("MyTurn:change", () => { renderBranches(); renderServices(); });

  /* ================= OVERVIEW STATS ================= */
  function renderStats() {
    const a = Store.getAnalytics().totals;
    const branches = Store.getBranches().length;
    const completionRate = Math.round((a.completed / a.visitors) * 100);

    App.qs("#adminStats").innerHTML = `
      ${stat("users", "blue",  "Visitors (7 days)", a.visitors, "across all branches")}
      ${stat("checkCircle", "green", "Completion rate", completionRate + "%", a.completed + " served")}
      ${stat("clock", "amber", "Avg wait time", a.avgWait + " min", "avg service " + a.avgService + " min")}
      ${stat("building", "blue", "Active branches", branches, Store.getServices().length + " services")}`;
  }
  function stat(icon, tone, label, value, sub) {
    return `<div class="stat-card">
      <div class="st-top"><div class="st-label">${label}</div><span class="st-icon ${tone}">${Icons.get(icon,20)}</span></div>
      <div class="st-value">${App.esc(String(value))}</div>
      <div class="st-sub">${App.esc(sub || "")}</div>
    </div>`;
  }

  /* ================= CHARTS (Chart.js) ================= */
  function renderCharts() {
    const a = Store.getAnalytics();
    if (typeof Charts === "undefined" || typeof Chart === "undefined") {
      console.warn("MyTurn: Chart.js or Charts module not loaded.");
      return;
    }

    Charts.globalDefaults();

    // Build avg wait trend from visitorsPerDay (simulate avg wait per day)
    const avgWaitData = a.visitorsPerDay.map((d, i) => ({
      day: d.day,
      avgWait: [18, 22, 15, 27, 20, 12, 24][i] || 18
    }));

    Charts.track(Charts.renderDailyVisitors("chartVisitors", a.visitorsPerDay));
    Charts.track(Charts.renderPeakHours("chartPeak", a.peakHours));
    Charts.track(Charts.renderPopularServices("chartPopular", a.popularServices));
    Charts.track(Charts.renderServiceDoughnut("chartDoughnut", a.totals));
    Charts.track(Charts.renderAvgWaitLine("chartAvgWait", avgWaitData));

    // Re-render on theme change
    document.addEventListener("myturn:themechange", function() {
      Charts.destroyAll();
      Charts.globalDefaults();
      Charts.track(Charts.renderDailyVisitors("chartVisitors", a.visitorsPerDay));
      Charts.track(Charts.renderPeakHours("chartPeak", a.peakHours));
      Charts.track(Charts.renderPopularServices("chartPopular", a.popularServices));
      Charts.track(Charts.renderServiceDoughnut("chartDoughnut", a.totals));
      Charts.track(Charts.renderAvgWaitLine("chartAvgWait", avgWaitData));
    });
  }

  /* ================= BRANCH MANAGEMENT ================= */
  function renderBranches() {
    const wrap = App.qs("#branchList");
    if (!wrap) return;
    const branches = Store.getBranches();
    wrap.innerHTML = branches.map(b => {
      const services = Store.getServices(b.id).length;
      const counters = Store.getCounters(b.id).length;
      return `<div class="list-row">
        <div class="lr-logo ${b.logo}">${App.esc(b.initials)}</div>
        <div class="lr-main">
          <div class="lr-title">${App.esc(b.name)}</div>
          <div class="lr-sub">${App.esc(b.category)} · ${App.esc(b.area)}, ${App.esc(b.city)} · ${App.esc(b.openTime)}–${App.esc(b.closeTime)}</div>
        </div>
        <div class="lr-meta">
          <div class="m"><div class="v">${services}</div><div class="k">Services</div></div>
          <div class="m"><div class="v">${counters}</div><div class="k">Counters</div></div>
          <div class="m"><div class="v">${b.status === "OPEN" ? "Open" : "Closed"}</div><div class="k">Status</div></div>
        </div>
        <div class="lr-actions">
          <button class="btn btn-ghost btn-icon" data-del-branch="${b.id}" aria-label="Delete branch" title="Delete">${Icons.get("trash",18)}</button>
        </div>
      </div>`;
    }).join("");

    App.qsa("[data-del-branch]", wrap).forEach(btn =>
      btn.addEventListener("click", () => deleteBranch(Number(btn.getAttribute("data-del-branch")))));
  }

  const LOGO_COLORS = ["logo-indigo", "logo-teal", "logo-rose", "logo-amber", "logo-sky", "logo-violet"];

  function wireBranchModal() {
    const addBtn = App.qs("#addBranchBtn");
    const form = App.qs("#branchForm");
    if (!addBtn) return;
    addBtn.addEventListener("click", () => { form.reset(); Modal.open("branchModal"); });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      if (name.length < 2) { Toast.error("Name required", "Please enter a branch name."); return; }

      Store.update((data) => {
        const id = data.meta.sequences.branches++;
        data.branches.push({
          id, name,
          category: form.category.value,
          area: form.area.value.trim() || "—",
          city: form.city.value.trim() || "Indore",
          status: form.status.value,
          openTime: form.openTime.value || "09:00",
          closeTime: form.closeTime.value || "18:00",
          logo: LOGO_COLORS[id % LOGO_COLORS.length],
          initials: App.initials(name)
        });
      });
      Modal.close("branchModal");
      renderBranches();
      renderStats();
      refreshServiceBranchOptions();
      Toast.success("Branch added", `${name} is now live.`);
    });
  }

  async function deleteBranch(id) {
    const branch = Store.getBranch(id);
    const svcCount = Store.getServices(id).length;
    const ok = await Confirm({
      title: "Delete " + branch.name + "?",
      message: `This will also remove its ${svcCount} service(s). This can't be undone (demo data can be reset from Profile).`,
      confirmText: "Delete branch", danger: true
    });
    if (!ok) return;
    Store.update((data) => {
      data.branches = data.branches.filter(b => b.id !== id);
      data.services = data.services.filter(s => s.branchId !== id);
    });
    renderBranches();
    renderServices();
    renderStats();
    refreshServiceBranchOptions();
    Toast.success("Branch deleted");
  }

  /* ================= SERVICE MANAGEMENT ================= */
  function renderServices() {
    const wrap = App.qs("#serviceList");
    if (!wrap) return;
    const services = Store.getServices();
    if (!services.length) { wrap.innerHTML = `<p class="text-subtle" style="padding:16px">No services yet. Add one to get started.</p>`; return; }

    wrap.innerHTML = services.map(s => {
      const branch = Store.getBranch(s.branchId);
      return `<div class="list-row">
        <div class="lr-logo ${branch ? branch.logo : "logo-indigo"}">${App.esc(s.prefix)}</div>
        <div class="lr-main">
          <div class="lr-title">${App.esc(s.name)} ${s.active ? "" : '<span class="badge badge-warning" style="margin-left:6px">Inactive</span>'}</div>
          <div class="lr-sub">${App.esc(branch ? branch.name : "—")} · ${s.counters} counter(s) · ${s.priorityEnabled ? "priority on" : "FIFO"}</div>
        </div>
        <div class="lr-meta">
          <div class="m"><div class="v">${s.avgServiceTime}m</div><div class="k">Avg time</div></div>
          <div class="m"><div class="v">#${s.nowServing}</div><div class="k">Serving</div></div>
        </div>
        <div class="lr-actions">
          <button class="btn btn-ghost btn-icon" data-edit-service="${s.id}" aria-label="Edit service" title="Edit">${Icons.get("edit",18)}</button>
          <button class="btn btn-ghost btn-icon" data-del-service="${s.id}" aria-label="Remove service" title="Remove">${Icons.get("trash",18)}</button>
        </div>
      </div>`;
    }).join("");

    App.qsa("[data-edit-service]", wrap).forEach(btn =>
      btn.addEventListener("click", () => openServiceModal(Number(btn.getAttribute("data-edit-service")))));
    App.qsa("[data-del-service]", wrap).forEach(btn =>
      btn.addEventListener("click", () => deleteService(Number(btn.getAttribute("data-del-service")))));
  }

  function refreshServiceBranchOptions() {
    const sel = App.qs("#svBranch");
    if (sel) sel.innerHTML = Store.getBranches().map(b => `<option value="${b.id}">${App.esc(b.name)}</option>`).join("");
  }

  function wireServiceModal() {
    const addBtn = App.qs("#addServiceBtn");
    const form = App.qs("#serviceForm");
    if (!addBtn) return;
    refreshServiceBranchOptions();
    addBtn.addEventListener("click", () => openServiceModal(null));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const editId = form.dataset.editId ? Number(form.dataset.editId) : null;
      const name = form.name.value.trim();
      if (name.length < 2) { Toast.error("Name required", "Please enter a service name."); return; }

      const payload = {
        branchId: Number(form.branch.value),
        name,
        prefix: (form.prefix.value.trim() || name[0] || "Q").toUpperCase().slice(0, 2),
        avgServiceTime: Math.max(1, Number(form.avgTime.value) || 5),
        counters: Math.max(1, Number(form.counters.value) || 1),
        priorityEnabled: form.priority.checked,
        active: form.active.checked
      };

      if (editId) {
        Store.update((data) => {
          const s = data.services.find(x => x.id === editId);
          if (s) Object.assign(s, payload);
        });
        Toast.success("Service updated", `${name} was saved.`);
      } else {
        Store.update((data) => {
          const id = data.meta.sequences.services++;
          data.services.push(Object.assign({ id, nowServing: 0, lastIssued: 0 }, payload));
        });
        Toast.success("Service added", `${name} is now available.`);
      }
      Modal.close("serviceModal");
      renderServices();
      renderStats();
    });
  }

  function openServiceModal(id) {
    const form = App.qs("#serviceForm");
    refreshServiceBranchOptions();
    if (id) {
      const s = Store.getService(id);
      form.dataset.editId = id;
      App.qs("#serviceModalTitle").textContent = "Edit service";
      form.branch.value = s.branchId;
      form.name.value = s.name;
      form.prefix.value = s.prefix;
      form.avgTime.value = s.avgServiceTime;
      form.counters.value = s.counters;
      form.priority.checked = s.priorityEnabled;
      form.active.checked = s.active;
    } else {
      delete form.dataset.editId;
      App.qs("#serviceModalTitle").textContent = "Add service";
      form.reset();
      form.active.checked = true;
    }
    Modal.open("serviceModal");
  }

  async function deleteService(id) {
    const s = Store.getService(id);
    const ok = await Confirm({
      title: "Remove " + s.name + "?",
      message: "This service and its queue configuration will be removed.",
      confirmText: "Remove service", danger: true
    });
    if (!ok) return;
    Store.remove("services", id);
    renderServices();
    renderStats();
    Toast.success("Service removed");
  }
};
