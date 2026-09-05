/* ============================================================
   MyTurn — Staff Queue Console (staff.js)
   ------------------------------------------------------------
   Controller for staff-dashboard.html.

   A staff member is tied to ONE counter (see users[].counterId),
   and that counter serves ONE service. This console lets them
   drive the queue with a clear state machine:

       [idle] --Call Next--> [serving] --Complete/Skip--> [idle]
                              [serving] --Recall--> (re-announce)

   All the actual queue logic lives in QueueEngine (queue.js);
   this file is just the screen that calls it and re-renders.
   ============================================================ */
window.Pages["staff-dashboard"] = function () {
  const staff = Auth.currentUser();

  // Resolve the counter + service this staff member operates.
  const counter = Store.getCounter(staff.counterId) ||
                  Store.getCounters(staff.branchId).find(c => c.staffId === staff.id);
  if (!counter) {
    App.qs("#staffMain").innerHTML =
      `<div class="alert alert-warning">No counter is assigned to your account in this demo.</div>`;
    return;
  }
  const serviceId = counter.serviceId;
  const branch = Store.getBranch(counter.branchId);

  render();

  // Live sync: if a user joins/cancels in another tab, reflect it here.
  document.addEventListener("MyTurn:change", render);
  window.addEventListener("storage", (e) => { if (e.key === "MyTurn_db") render(); });

  function render() {
    const service = Store.getService(serviceId);
    const serving = QueueEngine.getServing(serviceId);
    const waiting = QueueEngine.orderedWaiting(serviceId);
    const servedToday = Store.getServiceTokens(serviceId).filter(t => t.status === "completed").length;
    const estForNew = QueueEngine.calculateEstimatedWait(waiting.length, service.avgServiceTime);

    // ---- Header ----
    App.qs("#svcName").textContent = service.name;
    App.qs("#svcBranch").textContent = branch.name;

    // ---- Stat cards ----
    App.qs("#staffStats").innerHTML = `
      ${stat("users", "blue", "People Waiting", waiting.length, waiting.length ? "in the queue" : "queue is clear")}
      ${stat("activity", "green", "Now Serving", serving ? "#" + serving.code : "—", counter.name, true)}
      ${stat("checkCircle", "green", "Served Today", servedToday, "tokens completed")}
      ${stat("clock", "amber", "Est. Wait (new)", App.formatMins(estForNew), "for the next joiner")}`;

    // ---- Counter panel (current token + actions) ----
    renderCounterPanel(service, serving, waiting);

    // ---- Priority-ordered queue table ----
    renderQueueTable(service, waiting, serving);
  }

  function stat(icon, tone, label, value, sub, mono) {
    return `<div class="stat-card">
      <div class="st-top"><div class="st-label">${label}</div><span class="st-icon ${tone}">${Icons.get(icon,20)}</span></div>
      <div class="st-value ${mono ? "mono" : ""}">${App.esc(String(value))}</div>
      <div class="st-sub">${App.esc(sub || "")}</div>
    </div>`;
  }

  /* ---- Counter panel: the big "now serving" + 4 action buttons ---- */
  function renderCounterPanel(service, serving, waiting) {
    const panel = App.qs("#counterPanel");
    const isServing = !!serving;
    const next = waiting[0];
    const servingUser = serving && serving.userId ? Store.getUsers().find(u => u.id === serving.userId) : null;

    panel.innerHTML = `
      <div class="row-between wrap mb-3">
        <span class="counter-badge">${Icons.get("grid",16)} ${App.esc(counter.name)}</span>
        <span class="badge ${isServing ? "badge-brand" : "badge-plain"}">${isServing ? "Serving" : "Idle"}</span>
      </div>

      <div class="now-serving">
        <div class="ns-label">Now serving</div>
        <div class="ns-number">${isServing ? "#" + App.esc(serving.code) : "—"}</div>
        ${isServing
          ? `<div class="text-muted" style="font-size:.88rem">${servingUser ? App.esc(servingUser.name) + " · " : ""}${typeLabel(serving.type)} · waited ${App.formatMins(QueueEngine.waitingMinutes(serving))}</div>`
          : `<div class="text-muted" style="font-size:.88rem">${next ? "Next up: #" + App.esc(next.code) : "No one is waiting"}</div>`}
      </div>

      <div class="staff-actions">
        <button class="btn" id="callNextBtn" ${isServing || !next ? "disabled" : ""}>
          ${Icons.get("play",18)} Call Next${next && !isServing ? " (#" + App.esc(next.code) + ")" : ""}
        </button>
        <button class="btn btn-success" id="completeBtn" ${isServing ? "" : "disabled"}>
          ${Icons.get("check",18)} Complete
        </button>
        <button class="btn btn-secondary" id="recallBtn" ${isServing ? "" : "disabled"}>
          ${Icons.get("rotate",18)} Recall
        </button>
        <button class="btn btn-danger" id="skipBtn" ${isServing ? "" : "disabled"}>
          ${Icons.get("skip",18)} Skip
        </button>
      </div>

      <p class="form-hint" style="margin-top:16px">
        ${isServing
          ? "Complete or skip the current token to free the counter, then call the next person."
          : "Call the next token to begin serving. Priority and waiting time decide who's next."}
      </p>`;

    // Wire actions
    const cn = App.qs("#callNextBtn"); if (cn) cn.addEventListener("click", onCallNext);
    const cp = App.qs("#completeBtn"); if (cp) cp.addEventListener("click", onComplete);
    const rc = App.qs("#recallBtn");   if (rc) rc.addEventListener("click", onRecall);
    const sk = App.qs("#skipBtn");     if (sk) sk.addEventListener("click", onSkip);
  }

  /* ---- Queue table (priority order) ---- */
  function renderQueueTable(service, waiting, serving) {
    const body = App.qs("#queueTableBody");
    const empty = App.qs("#queueEmpty");
    const wrap = App.qs("#queueTableWrap");

    body.innerHTML = "";
    empty.classList.toggle("hidden", waiting.length > 0);
    wrap.classList.toggle("hidden", waiting.length === 0);

    waiting.forEach((t, i) => {
      const u = t.userId ? Store.getUsers().find(x => x.id === t.userId) : null;
      const tr = App.el("tr");
      if (i === 0) tr.className = "is-serving"; // next to be called
      tr.innerHTML = `
        <td data-label="Position" class="num">${i + 1}</td>
        <td data-label="Token"><span class="t-token">#${App.esc(t.code)}</span></td>
        <td data-label="Type">${typeBadge(t.type)}</td>
        <td data-label="Visitor">${u ? App.esc(u.name) : '<span class="text-subtle">Walk-in</span>'}</td>
        <td data-label="Waited" class="num">${App.formatMins(QueueEngine.waitingMinutes(t))}</td>
        <td data-label="Priority">${i === 0 ? '<span class="badge badge-brand badge-plain">Next</span>' : '<span class="text-subtle">#' + (i + 1) + '</span>'}</td>`;
      body.appendChild(tr);
    });
  }

  /* ---- Type helpers ---- */
  function typeBadge(type) {
    if (type === "emergency")   return '<span class="badge badge-danger">Emergency</span>';
    if (type === "appointment") return '<span class="badge badge-info">Appointment</span>';
    return '<span class="badge badge-plain">Normal</span>';
  }
  function typeLabel(type) {
    return type === "emergency" ? "Emergency" : type === "appointment" ? "Appointment" : "Normal";
  }

  /* ---- Action handlers ---- */
  function onCallNext() {
    const res = QueueEngine.callNext(serviceId, counter.id);
    if (!res.ok) { Toast.error("Can't call next", res.error); return; }
    render();
    Toast.success("Now serving #" + res.token.code, "Counter " + counter.name.replace(/\D/g, "") + " is ready.");
  }
  function onComplete() {
    const res = QueueEngine.completeCurrent(serviceId);
    if (!res.ok) { Toast.error("Nothing to complete", res.error); return; }
    render();
    Toast.success("Completed #" + res.token.code, "Ready for the next person.");
  }
  async function onSkip() {
    const serving = QueueEngine.getServing(serviceId);
    if (!serving) { Toast.error("Nothing to skip"); return; }
    const ok = await Confirm({
      title: "Skip #" + serving.code + "?",
      message: "Use this if the visitor didn't respond. They'll be marked as skipped.",
      confirmText: "Skip token", danger: true
    });
    if (!ok) return;
    const res = QueueEngine.skipCurrent(serviceId);
    if (res.ok) { render(); Toast.info("Skipped #" + res.token.code); }
  }
  function onRecall() {
    const res = QueueEngine.recall(serviceId);
    if (!res.ok) { Toast.error("Nothing to recall", res.error); return; }
    Toast.info("Recalling #" + res.token.code, "Announced again at " + counter.name + ".");
  }

  /* ---- Staff Analytics Charts (Chart.js) ---- */
  function renderStaffCharts() {
    if (typeof Charts === "undefined" || typeof Chart === "undefined") return;
    const a = Store.getAnalytics();
    Charts.globalDefaults();
    Charts.track(Charts.renderDailyVisitors("staffChartVisitors", a.visitorsPerDay));
    Charts.track(Charts.renderServiceDoughnut("staffChartDoughnut", a.totals));
    Charts.track(Charts.renderPeakHours("staffChartPeak", a.peakHours));

    document.addEventListener("myturn:themechange", function() {
      Charts.destroyAll();
      Charts.globalDefaults();
      Charts.track(Charts.renderDailyVisitors("staffChartVisitors", a.visitorsPerDay));
      Charts.track(Charts.renderServiceDoughnut("staffChartDoughnut", a.totals));
      Charts.track(Charts.renderPeakHours("staffChartPeak", a.peakHours));
    });
  }
  // Render staff charts after initial page load
  setTimeout(renderStaffCharts, 400);
};

