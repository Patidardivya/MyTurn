/* ============================================================
   MyTurn — Queue Engine + Queue Pages (queue.js)
   ------------------------------------------------------------
   Two things live here:

   (A) QueueEngine — the shared "business logic" for queues:
       token generation, priority ordering, people-ahead, and
       estimated-wait math. Also used by staff.js. In the future
       this exact logic moves to the Node/Express + PostgreSQL
       backend; the browser would just call the REST API.

   (B) Page controllers for:
         • user-dashboard  (overview + Find Services + Join Queue)
         • queue           (My Queue live tracking)

   Loaded on: user-dashboard.html, queue.html, staff-dashboard.html
   ============================================================ */

/* ==================================================================
   (A) QUEUE ENGINE
   ================================================================== */
const QueueEngine = (function () {
  "use strict";

  /* ---- Priority model (Section 14) ----
     Lower "score" = served sooner. We start from a base weight per
     type, then SUBTRACT points for every minute already waited.
     This "aging" guarantees a plain normal token eventually
     overtakes higher classes, so no one waits forever (no starvation). */
  const TYPE_WEIGHT   = { emergency: 0, appointment: 100, normal: 200 };
  const AGING_PER_MIN = 6;   // each minute waited removes 6 points

  const priorityRank = (type) => (type === "emergency" ? 0 : type === "appointment" ? 1 : 2);

  function waitingMinutes(token) {
    return Math.max(0, (Date.now() - new Date(token.issuedAt).getTime()) / 60000);
  }

  // effectiveScore: combines class + how long they've waited.
  function effectiveScore(token) {
    const base = TYPE_WEIGHT[token.type] != null ? TYPE_WEIGHT[token.type] : 200;
    return base - waitingMinutes(token) * AGING_PER_MIN;
  }

  // Comparator: best (lowest) score first; ties broken by token number (FIFO).
  function compareTokens(a, b) {
    const d = effectiveScore(a) - effectiveScore(b);
    return d !== 0 ? d : a.number - b.number;
  }

  // All still-waiting tokens for a service, in the order they'll be served.
  function orderedWaiting(serviceId) {
    return Store.getServiceTokens(serviceId)
      .filter(t => t.status === "waiting")
      .sort(compareTokens);
  }

  // How many people will be served before THIS token (Section — queue position).
  function computePeopleAhead(token) {
    if (!token || token.status !== "waiting") return 0;
    const order = orderedWaiting(token.serviceId);
    const idx = order.findIndex(t => t.id === token.id);
    return idx < 0 ? 0 : idx;
  }

  /* ---- Estimated waiting time (Section 31) ----
     Base formula required by the brief: peopleAhead × avgServiceTime.
     Kept as its own function so it can later factor in the number of
     active counters, recent real service durations, historical
     averages, etc. `activeCounters` defaults to 1 so the base result
     matches the simple formula.                                      */
  function calculateEstimatedWait(peopleAhead, avgServiceTime, activeCounters = 1) {
    const counters = Math.max(1, activeCounters);
    return Math.round((peopleAhead * avgServiceTime) / counters);
  }

  // Currently-serving token for a service (or null).
  const getServing = (serviceId) =>
    Store.getServiceTokens(serviceId).find(t => t.status === "serving") || null;

  /* ---- Token generation (Sections 7 & 30) ----
     issueToken() hands out the next sequential number for a service.

     ⚠️ CONCURRENCY NOTE: In this front-end demo, JavaScript runs on a
     single thread, so read-modify-write of `lastIssued` cannot be
     interrupted — two clicks can't grab the same number here.
     On a REAL backend with 100 users at once, we MUST protect this with
     an atomic DB operation, e.g. a transaction with
       UPDATE services SET last_issued = last_issued + 1 ... RETURNING
     or a Redis INCR / Postgres sequence. That guarantees
       A→#101, B→#102, C→#103  and never two people on #101.          */
  function issueToken(serviceId, userId, type = "normal") {
    const service = Store.getService(serviceId);
    if (!service) return { ok: false, error: "Service not found." };

    let token;
    Store.update((data) => {
      const svc = data.services.find(s => s.id === Number(serviceId));
      svc.lastIssued += 1;                          // atomic in-browser (see note above)
      const number = svc.lastIssued;
      const id = data.meta.sequences.tokens++;
      token = {
        id, number, code: `${svc.prefix}${number}`,
        branchId: svc.branchId, serviceId: svc.id, userId: Number(userId),
        type, status: "waiting", counterId: null,
        issuedAt: new Date().toISOString(), calledAt: null, completedAt: null,
        joinServing: svc.nowServing            // remember the "now serving" at join time (for progress %)
      };
      data.tokens.push(token);
    });
    Store.logEvent(serviceId, token.id, "issued", "self-service");
    return { ok: true, token };
  }

  /* ---- Staff state transitions (Section 15) ---- */
  function callNext(serviceId, counterId) {
    const order = orderedWaiting(serviceId);
    if (!order.length) return { ok: false, error: "No one is waiting in this queue." };
    const next = order[0];
    Store.update((data) => {
      const t = data.tokens.find(x => x.id === next.id);
      t.status = "serving"; t.counterId = counterId || t.counterId; t.calledAt = new Date().toISOString();
      const svc = data.services.find(s => s.id === Number(serviceId));
      svc.nowServing = t.number;
    });
    Store.logEvent(serviceId, next.id, "called", "Counter " + (counterId || "?"));
    return { ok: true, token: Store.getToken(next.id) };
  }

  function completeCurrent(serviceId) {
    const cur = getServing(serviceId);
    if (!cur) return { ok: false, error: "No token is currently being served." };
    Store.update((data) => {
      const t = data.tokens.find(x => x.id === cur.id);
      t.status = "completed"; t.completedAt = new Date().toISOString();
      // Record real wait/service durations for history + analytics.
      t.waitMinutes = t.calledAt ? Math.round((new Date(t.calledAt) - new Date(t.issuedAt)) / 60000) : null;
      t.serviceMinutes = t.calledAt ? Math.max(1, Math.round((Date.now() - new Date(t.calledAt)) / 60000)) : null;
    });
    Store.logEvent(serviceId, cur.id, "completed", "");
    return { ok: true, token: Store.getToken(cur.id) };
  }

  function skipCurrent(serviceId) {
    const cur = getServing(serviceId);
    if (!cur) return { ok: false, error: "No token is currently being served." };
    Store.update((data) => {
      const t = data.tokens.find(x => x.id === cur.id);
      t.status = "skipped";
    });
    Store.logEvent(serviceId, cur.id, "skipped", "");
    return { ok: true, token: Store.getToken(cur.id) };
  }

  function recall(serviceId) {
    const cur = getServing(serviceId);
    if (!cur) return { ok: false, error: "No token to recall." };
    Store.logEvent(serviceId, cur.id, "recalled", "");
    return { ok: true, token: cur };
  }

  /* advanceService(): complete whoever is serving, then call the next.
     Used by the My Queue page to SIMULATE the counter moving forward
     in real time. In production these transitions arrive as live
     WebSocket events pushed by the server — we would just re-render. */
  function advanceService(serviceId, counterId) {
    if (getServing(serviceId)) completeCurrent(serviceId);
    return callNext(serviceId, counterId);
  }

  // Count of people still waiting in a service (for discovery cards).
  const waitingCount = (serviceId) => orderedWaiting(serviceId).length;

  return {
    TYPE_WEIGHT, AGING_PER_MIN, priorityRank, waitingMinutes, effectiveScore,
    compareTokens, orderedWaiting, computePeopleAhead, calculateEstimatedWait,
    getServing, issueToken, callNext, completeCurrent, skipCurrent, recall,
    advanceService, waitingCount
  };
})();

/* ==================================================================
   Shared helpers used by the queue-related pages
   ================================================================== */
// Number of people "waiting" for a service, using the summary counters
// stored on the service (works even for services without seeded tokens).
function serviceWaitingSummary(service) {
  const realTokens = Store.getServiceTokens(service.id).filter(t => t.status === "waiting");
  if (realTokens.length) return realTokens.length;             // prefer real tokens if present
  return Math.max(0, service.lastIssued - service.nowServing); // else derive from counters
}
function serviceCounterName(service) {
  const c = Store.getCounters(service.branchId).find(x => x.serviceId === service.id);
  return c ? c.name : "Counter —";
}
function statusBadgeHtml(status) {
  const map = {
    waiting:   ["badge-info",    "Waiting"],
    serving:   ["badge-brand",   "Now Serving"],
    completed: ["badge-success", "Completed"],
    cancelled: ["badge-danger",  "Cancelled"],
    skipped:   ["badge-warning", "Skipped"],
    "no-show": ["badge-warning", "No-show"]
  };
  const [cls, label] = map[status] || ["", status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ==================================================================
   (B1) USER DASHBOARD — overview + Find Services + Join Queue
   ================================================================== */
window.Pages["user-dashboard"] = function () {
  const user = Auth.currentUser();

  // Personalize the welcome card greeting with first name
  const welcomeEl = App.qs("#welcomeHeading");
  if (welcomeEl && user) {
    const firstName = user.name.split(" ")[0];
    welcomeEl.textContent = `Welcome back, ${firstName}! 👋`;
  }

  renderOverview();
  renderServiceCenters();
  wireJoinModal();
  wireBookModal();

  // Keep the dashboard in sync if the queue changes in another tab.
  document.addEventListener("MyTurn:change", renderOverview);
  window.addEventListener("storage", (e) => { if (e.key === "MyTurn_db") renderOverview(); });


  /* ---- Overview cards ---- */
  function renderOverview() {
    const token = Store.getUserActiveToken(user.id);
    const grid = App.qs("#overviewCards");
    const cta = App.qs("#overviewCta");
    if (!grid) return;

    if (!token) {
      // Empty state: no active queue.
      grid.innerHTML = "";
      grid.classList.add("hidden");
      if (cta) cta.classList.remove("hidden");
      return;
    }
    if (cta) cta.classList.add("hidden");
    grid.classList.remove("hidden");

    const service = Store.getService(token.serviceId);
    const serving = QueueEngine.getServing(token.serviceId);
    const peopleAhead = QueueEngine.computePeopleAhead(token);
    const wait = QueueEngine.calculateEstimatedWait(peopleAhead, service.avgServiceTime);
    const nowServing = serving ? serving.code : (service.prefix + service.nowServing);

    grid.innerHTML = `
      ${statCard("ticket", "brand", "Current Token", "#" + token.code, service.name, true)}
      ${statCard("users", "blue", "People Ahead", peopleAhead, peopleAhead === 0 ? "You're next!" : "in the queue")}
      ${statCard("clock", "amber", "Estimated Wait", App.formatMins(wait), "at ~" + service.avgServiceTime + " min each")}
      ${statCard("activity", "green", "Now Serving", "#" + nowServing, serviceCounterName(service))}`;
  }
  function statCard(icon, tone, label, value, sub, mono) {
    return `<div class="stat-card">
        <div class="st-top">
          <div><div class="st-label">${label}</div></div>
          <span class="st-icon ${tone}">${Icons.get(icon, 20)}</span>
        </div>
        <div class="st-value ${mono ? "mono" : ""}">${App.esc(String(value))}</div>
        <div class="st-sub">${App.esc(sub || "")}</div>
      </div>`;
  }

  /* ---- Find Services: render every branch as a discovery card ---- */
  function renderServiceCenters() {
    const wrap = App.qs("#centersGrid");
    if (!wrap) return;
    const category = App.qs("#centerFilter") ? App.qs("#centerFilter").value : "all";

    const branches = Store.getBranches().filter(b => category === "all" || b.category === category);
    wrap.innerHTML = "";

    branches.forEach(branch => {
      const services = Store.getServices(branch.id).filter(s => s.active);
      const totalWaiting = services.reduce((sum, s) => sum + serviceWaitingSummary(s), 0);
      const avgWait = services.length
        ? Math.round(services.reduce((sum, s) => sum + QueueEngine.calculateEstimatedWait(serviceWaitingSummary(s), s.avgServiceTime), 0) / services.length)
        : 0;
      const counters = Store.getCounters(branch.id).length || services.reduce((a, s) => a + s.counters, 0);
      const isOpen = branch.status === "OPEN";

      const card = App.el("div", { class: "card card-pad card-hover center-card" });
      card.innerHTML = `
        <div class="cc-head">
          <div class="cc-logo ${branch.logo}">${App.esc(branch.initials)}</div>
          <div style="flex:1;min-width:0">
            <div class="row-between">
              <div class="cc-name">${App.esc(branch.name)}</div>
              <span class="badge ${isOpen ? "badge-success" : "badge-danger"}">${isOpen ? "Open" : "Closed"}</span>
            </div>
            <div class="cc-loc">${Icons.get("mapPin", 15)} ${App.esc(branch.area)}, ${App.esc(branch.city)}</div>
          </div>
        </div>
        <div class="cc-services">
          ${services.slice(0, 4).map(s => `<span class="chip">${App.esc(s.name)}</span>`).join("")}
          ${services.length > 4 ? `<span class="chip">+${services.length - 4} more</span>` : ""}
        </div>
        <div class="cc-metrics">
          <div class="cc-metric"><div class="v">${totalWaiting}</div><div class="k">Waiting</div></div>
          <div class="cc-metric"><div class="v">${avgWait}m</div><div class="k">Avg wait</div></div>
          <div class="cc-metric"><div class="v">${counters}</div><div class="k">Counters</div></div>
        </div>
        <div class="cc-actions">
          <button class="btn btn-block" data-join-branch="${branch.id}" ${isOpen ? "" : "disabled"}>Join Queue</button>
          <button class="btn btn-secondary btn-block" data-book-branch="${branch.id}">Book Appointment</button>
        </div>`;
      wrap.appendChild(card);
    });

    App.qsa("[data-join-branch]", wrap).forEach(btn =>
      btn.addEventListener("click", () => openJoinModal(Number(btn.getAttribute("data-join-branch")))));
    App.qsa("[data-book-branch]", wrap).forEach(btn =>
      btn.addEventListener("click", () => openBookModal(Number(btn.getAttribute("data-book-branch")))));
  }
  const filterSel = App.qs("#centerFilter");
  if (filterSel) filterSel.addEventListener("change", renderServiceCenters);

  /* ---- JOIN QUEUE modal (Section 7) ---- */
  function openJoinModal(branchId) {
    const branch = Store.getBranch(branchId);
    const services = Store.getServices(branchId).filter(s => s.active);
    const select = App.qs("#joinService");
    App.qs("#joinBranchName").textContent = branch.name;
    select.innerHTML = services.map(s => `<option value="${s.id}">${App.esc(s.name)}</option>`).join("");

    // If the user already has an active token, steer them to My Queue instead.
    const active = Store.getUserActiveToken(user.id);
    const alreadyBox = App.qs("#joinAlready");
    const stepPick = App.qs("#joinStepPick");
    const stepResult = App.qs("#joinStepResult");
    const footer = App.qs("#joinFooter");
    stepResult.classList.add("hidden");
    // reset footer buttons to "step 1" state
    App.qs("#getTokenBtn").classList.remove("hidden");
    App.qs("#joinResultGo").classList.add("hidden");
    if (active) {
      // Already holding a token -> show the notice, hide the picker + footer actions.
      alreadyBox.classList.remove("hidden");
      stepPick.classList.add("hidden");
      footer.classList.add("hidden");
      App.qs("#joinActiveCode").textContent = "#" + active.code;
    } else {
      alreadyBox.classList.add("hidden");
      stepPick.classList.remove("hidden");
      footer.classList.remove("hidden");
      updateJoinPreview();
    }
    Modal.open("joinModal");
  }
  function updateJoinPreview() {
    const service = Store.getService(App.qs("#joinService").value);
    if (!service) return;
    const serving = QueueEngine.getServing(service.id);
    const waiting = serviceWaitingSummary(service);
    const eta = QueueEngine.calculateEstimatedWait(waiting, service.avgServiceTime);
    App.qs("#jpServing").textContent = "#" + (serving ? serving.code : service.prefix + service.nowServing);
    App.qs("#jpWaiting").textContent = waiting;
    App.qs("#jpAvg").textContent = service.avgServiceTime + " min";
    App.qs("#jpEta").textContent = App.formatMins(eta);
  }
  function wireJoinModal() {
    const select = App.qs("#joinService");
    if (select) select.addEventListener("change", updateJoinPreview);

    const getTokenBtn = App.qs("#getTokenBtn");
    if (getTokenBtn) getTokenBtn.addEventListener("click", () => {
      const serviceId = Number(App.qs("#joinService").value);
      setLoading(getTokenBtn, true, "Reserving your spot…");
      // brief delay = realistic "server issuing token" feel
      setTimeout(() => {
        const res = QueueEngine.issueToken(serviceId, user.id, "normal");
        setLoading(getTokenBtn, false);
        if (!res.ok) { Toast.error("Could not join", res.error); return; }
        showJoinResult(res.token);
        addQueueNotification(res.token);
        renderOverview();
        Toast.success("Token generated successfully", `Your token is #${res.token.code}.`);
      }, 650);
    });

    const goQueueBtns = App.qsa("[data-goto-queue]");
    goQueueBtns.forEach(b => b.addEventListener("click", () => (window.location.href = "queue.html")));
  }
  function showJoinResult(token) {
    const service = Store.getService(token.serviceId);
    const serving = QueueEngine.getServing(service.id);
    const peopleAhead = QueueEngine.computePeopleAhead(token);
    const eta = QueueEngine.calculateEstimatedWait(peopleAhead, service.avgServiceTime);

    App.qs("#joinStepPick").classList.add("hidden");
    App.qs("#joinAlready").classList.add("hidden");
    // Swap footer buttons: hide "Get token", reveal "Track my queue".
    App.qs("#getTokenBtn").classList.add("hidden");
    App.qs("#joinResultGo").classList.remove("hidden");
    const box = App.qs("#joinStepResult");
    box.classList.remove("hidden");
    box.querySelector("#jrNumber").textContent = "#" + token.code;
    box.querySelector("#jrAhead").textContent = peopleAhead;
    box.querySelector("#jrEta").textContent = App.formatMins(eta);
    box.querySelector("#jrServing").textContent = "#" + (serving ? serving.code : service.prefix + service.nowServing);
    box.querySelector("#jrCounter").textContent = serviceCounterName(service);
  }
  function addQueueNotification(token) {
    const service = Store.getService(token.serviceId);
    const branch = Store.getBranch(token.branchId);
    Store.update((data) => {
      data.notifications.push({
        id: data.meta.sequences.notifications++, userId: user.id, type: "queue",
        title: "Token issued",
        message: `Your token is now #${token.code} for ${service.name} at ${branch.name}.`,
        read: false, createdAt: new Date().toISOString()
      });
    });
  }

  /* ---- BOOK APPOINTMENT modal ---- */
  function openBookModal(branchId) {
    const branch = Store.getBranch(branchId);
    const services = Store.getServices(branchId).filter(s => s.active);
    App.qs("#bookBranchName").textContent = branch.name;
    App.qs("#bookService").innerHTML = services.map(s => `<option value="${s.id}">${App.esc(s.name)}</option>`).join("");
    const dateInput = App.qs("#bookDate");
    const today = new Date(); today.setDate(today.getDate() + 1);
    dateInput.min = new Date().toISOString().split("T")[0];
    dateInput.value = today.toISOString().split("T")[0];
    App.qs("#bookModal").dataset.branchId = branchId;
    Modal.open("bookModal");
  }
  function wireBookModal() {
    const form = App.qs("#bookForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const branchId = Number(App.qs("#bookModal").dataset.branchId);
      const serviceId = Number(form.service.value);
      const dateStr = form.date.value;
      const timeStr = form.time.value;
      if (!dateStr || !timeStr) { Toast.error("Missing details", "Please choose a date and time."); return; }
      const [hh, mm] = timeStr.split(":");
      const when = new Date(dateStr); when.setHours(Number(hh), Number(mm), 0, 0);

      Store.update((data) => {
        data.appointments.push({
          id: data.meta.sequences.appointments++, userId: user.id, branchId, serviceId,
          date: when.toISOString(), status: "CONFIRMED", note: form.note.value.trim()
        });
      });
      Modal.close("bookModal");
      Toast.success("Appointment booked", `Confirmed for ${App.formatDate(when.toISOString())} at ${App.formatTime(when.toISOString())}.`);
    });
  }
};

/* ==================================================================
   (B2) MY QUEUE — live tracking with real-time simulation
   ================================================================== */
window.Pages["queue"] = function () {
  const user = Auth.currentUser();
  const root = App.qs("#queueRoot");
  const emptyEl = App.qs("#queueEmpty");
  let simTimer = null;
  let lastAhead = null;        // used to decide when to fire "turn approaching" notifications

  render();

  // React to changes from other tabs (e.g. the STAFF dashboard calling next).
  document.addEventListener("MyTurn:change", render);
  window.addEventListener("storage", (e) => { if (e.key === "MyTurn_db") render(); });
  window.addEventListener("beforeunload", stopSim);

  function currentToken() { return Store.getUserActiveToken(user.id); }

  function render() {
    const token = currentToken();
    if (!token) {
      stopSim();
      root.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");
    root.classList.remove("hidden");

    const service = Store.getService(token.serviceId);
    const branch = Store.getBranch(token.branchId);
    const serving = QueueEngine.getServing(token.serviceId);
    const peopleAhead = QueueEngine.computePeopleAhead(token);
    const eta = QueueEngine.calculateEstimatedWait(peopleAhead, service.avgServiceTime);
    const isMyTurn = token.status === "serving";
    const counterName = token.counterId ? (Store.getCounter(token.counterId) || {}).name : serviceCounterName(service);

    // Progress %: how far the counter has moved from where it was when we joined.
    const start = token.joinServing != null ? token.joinServing : token.number - Math.max(1, peopleAhead + 1);
    const span = Math.max(1, token.number - start);
    const done = Math.min(span, service.nowServing - start);
    const progress = Math.max(0, Math.min(100, Math.round((done / span) * 100)));

    root.innerHTML = `
      <div class="split">
        <div class="stack">
          <!-- Token hero -->
          <div class="token-hero">
            <span class="status-chip">${isMyTurn ? '<span class="pulse"></span> Your turn' : (token.status === "waiting" ? "Waiting" : token.status)}</span>
            <div class="th-label">${App.esc(branch.name)} · ${App.esc(service.name)}</div>
            <div class="th-number">#${App.esc(token.code)}</div>
            <div class="th-meta">
              <div class="m"><div class="k">Now serving</div><div class="v">#${serving ? App.esc(serving.code) : service.prefix + service.nowServing}</div></div>
              <div class="m"><div class="k">People ahead</div><div class="v">${peopleAhead}</div></div>
              <div class="m"><div class="k">Est. wait</div><div class="v">${App.formatMins(eta)}</div></div>
              <div class="m"><div class="k">Counter</div><div class="v">${App.esc(counterName || "—")}</div></div>
            </div>
          </div>

          ${isMyTurn ? `<div class="alert alert-success">${Icons.get("checkCircle",20)} <div><b>It's your turn!</b> Please proceed to ${App.esc(counterName || "the counter")}.</div></div>` : ""}

          <!-- Progress -->
          <div class="card card-pad">
            <div class="row-between mb-2">
              <strong>Queue progress</strong>
              <span class="text-muted">${progress}%</span>
            </div>
            <div class="progress progress-lg"><div class="progress-bar" style="width:${progress}%"></div></div>
            <div class="row-between mt-2" style="font-size:.82rem;color:var(--text-subtle)">
              <span>Joined at #${service.prefix + start}</span>
              <span>Your token #${App.esc(token.code)}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="row wrap">
            <button class="btn btn-secondary" id="refreshBtn">${Icons.get("refresh",18)} Refresh status</button>
            <button class="btn btn-danger" id="cancelBtn" ${token.status === "serving" ? "disabled" : ""}>${Icons.get("x",18)} Cancel Queue</button>
            <span class="text-subtle" style="font-size:.8rem;align-self:center">${Icons.get("zap",14)} Live updates simulated every few seconds</span>
          </div>
        </div>

        <!-- Timeline -->
        <div class="card card-pad">
          <h3 class="mb-3">Queue timeline</h3>
          ${renderTimeline(token, service, serving, isMyTurn)}
        </div>
      </div>`;

    App.qs("#refreshBtn").addEventListener("click", () => { render(); Toast.info("Status refreshed"); });
    App.qs("#cancelBtn").addEventListener("click", onCancel);

    // Fire a gentle notification when the turn gets close (only once per threshold).
    maybeNotify(token, peopleAhead, counterName);
    lastAhead = peopleAhead;

    // Start / keep the live simulation running while we are still waiting.
    if (token.status === "waiting") startSim(service.id);
    else stopSim();
  }

  function renderTimeline(token, service, serving, isMyTurn) {
    const steps = [
      { title: "Joined the queue", time: App.formatTime(token.issuedAt), state: "done" },
      { title: `Now serving #${serving ? serving.code : service.prefix + service.nowServing}`, time: "In progress", state: isMyTurn ? "done" : "active" },
      { title: isMyTurn ? "Your turn — proceed to counter" : "Your turn", time: isMyTurn ? App.formatTime(token.calledAt) : "Upcoming", state: isMyTurn ? "active" : "" },
      { title: "Service completed", time: "Upcoming", state: "" }
    ];
    return `<div class="timeline">${steps.map(s => `
      <div class="tl-item ${s.state}">
        <span class="tl-dot">${s.state === "done" ? Icons.get("check", 12) : ""}</span>
        <div class="tl-title">${App.esc(s.title)}</div>
        <div class="tl-time">${App.esc(s.time)}</div>
      </div>`).join("")}</div>`;
  }

  async function onCancel() {
    const ok = await Confirm({
      title: "Cancel your token?",
      message: "You will lose your current position in the queue. This cannot be undone.",
      confirmText: "Cancel token", danger: true
    });
    if (!ok) return;
    const token = currentToken();
    Store.update((data) => {
      const t = data.tokens.find(x => x.id === token.id);
      if (t) t.status = "cancelled";
      data.notifications.push({
        id: data.meta.sequences.notifications++, userId: user.id, type: "warning",
        title: "Token cancelled", message: `You cancelled token #${token.code}.`,
        read: false, createdAt: new Date().toISOString()
      });
    });
    stopSim();
    render();
    Toast.success("Queue cancelled successfully", "Your token has been released.");
  }

  function maybeNotify(token, peopleAhead, counterName) {
    if (token.status === "serving" && lastAhead !== null && lastAhead > 0) {
      pushNotif("warning", "It's your turn", `Please proceed to ${counterName}.`);
    } else if (peopleAhead <= 2 && peopleAhead > 0 && (lastAhead === null || lastAhead > 2)) {
      pushNotif("warning", "Your turn is approaching", `Only ${peopleAhead} ${peopleAhead === 1 ? "person" : "people"} ahead of you.`);
    }
  }
  function pushNotif(type, title, message) {
    Store.update((data) => {
      data.notifications.push({
        id: data.meta.sequences.notifications++, userId: user.id, type, title, message,
        read: false, createdAt: new Date().toISOString()
      });
    });
  }

  /* ---- Real-time SIMULATION ----
     Every 6 seconds we advance the service (complete current, call next).
     This mimics staff serving people so the page feels alive.
     ➜ To go real: delete this timer and instead open a WebSocket:
          const ws = new WebSocket(WS_URL);
          ws.onmessage = (e) => { applyServerState(JSON.parse(e.data)); render(); };
       The render() function stays exactly the same.                    */
  function startSim(serviceId) {
    if (simTimer) return;
    simTimer = setInterval(() => {
      const token = currentToken();
      if (!token || token.status !== "waiting") { stopSim(); render(); return; }
      // Only advance while there is still someone to serve before/at us.
      QueueEngine.advanceService(serviceId, 2);
      render();
    }, 6000);
  }
  function stopSim() { if (simTimer) { clearInterval(simTimer); simTimer = null; } }
};
