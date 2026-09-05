/* ============================================================
   MyTurn — Appointments (appointments.js)
   ------------------------------------------------------------
   Controller for appointments.html. Lets a user:
     • see upcoming & past appointments
     • book a new appointment (branch -> service -> date/time)
     • cancel an upcoming appointment

   Registers itself into window.Pages so app.js runs it on load.
   ============================================================ */
window.Pages["appointments"] = function () {
  const user = Auth.currentUser();

  wireNewAppt();
  render();

  document.addEventListener("MyTurn:change", render);
  window.addEventListener("storage", (e) => { if (e.key === "MyTurn_db") render(); });

  /* ---- Split appointments into upcoming vs past ---- */
  function partition() {
    const all = Store.getUserAppointments(user.id);
    const now = Date.now();
    const upcoming = [], past = [];
    all.forEach(a => {
      const isFuture = new Date(a.date).getTime() >= now;
      const isLive = a.status === "CONFIRMED" || a.status === "PENDING";
      (isFuture && isLive ? upcoming : past).push(a);
    });
    // upcoming sorted soonest-first; past most-recent-first
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    past.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcoming, past };
  }

  function render() {
    const { upcoming, past } = partition();

    const up = App.qs("#apptUpcoming");
    const pastWrap = App.qs("#apptPast");
    const emptyUp = App.qs("#apptEmptyUpcoming");

    // ---- Upcoming ----
    up.innerHTML = "";
    emptyUp.classList.toggle("hidden", upcoming.length > 0);
    upcoming.forEach(a => up.appendChild(apptCard(a, true)));

    // ---- Past ----
    pastWrap.innerHTML = "";
    if (past.length === 0) {
      pastWrap.innerHTML = `<p class="text-subtle" style="font-size:.9rem">No past appointments yet.</p>`;
    } else {
      past.forEach(a => pastWrap.appendChild(apptCard(a, false)));
    }

    // Wire cancel buttons
    App.qsa("[data-cancel-appt]", up).forEach(btn =>
      btn.addEventListener("click", () => cancelAppt(Number(btn.getAttribute("data-cancel-appt")))));
  }

  /* ---- Build one appointment card ---- */
  function apptCard(appt, isUpcoming) {
    const branch = Store.getBranch(appt.branchId);
    const service = Store.getService(appt.serviceId);
    const d = new Date(appt.date);
    const statusMap = {
      CONFIRMED: "badge-success", PENDING: "badge-warning",
      COMPLETED: "badge-info", CANCELLED: "badge-danger"
    };

    const card = App.el("div", { class: "card card-pad appt-card" });
    card.innerHTML = `
      <div class="ac-top">
        <div class="row" style="gap:12px">
          <div class="cc-logo ${branch ? branch.logo : "logo-indigo"}" style="width:44px;height:44px;border-radius:12px;font-size:1rem">${App.esc(branch ? branch.initials : "?")}</div>
          <div>
            <div style="font-weight:700;color:var(--slate-900)">${App.esc(service ? service.name : "Service")}</div>
            <div class="text-muted" style="font-size:.86rem">${App.esc(branch ? branch.name : "")}</div>
          </div>
        </div>
        <span class="badge ${statusMap[appt.status] || ""}">${App.esc(appt.status)}</span>
      </div>

      <div class="ac-when">
        <div class="ac-date">
          <div class="d">${d.getDate()}</div>
          <div class="m">${d.toLocaleString("en-US", { month: "short" })}</div>
        </div>
        <div>
          <div style="font-weight:600;color:var(--slate-800)">${App.formatDate(appt.date)}</div>
          <div class="text-muted" style="font-size:.88rem">${App.formatTime(appt.date)}</div>
          ${appt.note ? `<div class="text-subtle" style="font-size:.82rem;margin-top:4px">“${App.esc(appt.note)}”</div>` : ""}
        </div>
      </div>

      ${isUpcoming ? `
        <div class="ac-actions">
          <button class="btn btn-secondary btn-sm" data-cancel-appt="${appt.id}">Cancel appointment</button>
        </div>` : ""}`;
    return card;
  }

  async function cancelAppt(id) {
    const ok = await Confirm({
      title: "Cancel appointment?",
      message: "This will release your reserved slot. You can always book again later.",
      confirmText: "Cancel appointment", danger: true
    });
    if (!ok) return;
    Store.update((data) => {
      const a = data.appointments.find(x => x.id === id);
      if (a) a.status = "CANCELLED";
    });
    render();
    Toast.success("Appointment cancelled", "Your slot has been released.");
  }

  /* ---- New appointment modal ---- */
  function wireNewAppt() {
    const newBtn = App.qs("#newApptBtn");
    const branchSel = App.qs("#apptBranch");
    const serviceSel = App.qs("#apptService");
    const form = App.qs("#apptForm");
    if (!newBtn) return;

    // Populate branch options once.
    branchSel.innerHTML = Store.getBranches()
      .map(b => `<option value="${b.id}">${App.esc(b.name)}</option>`).join("");

    // When branch changes, refresh its services.
    function fillServices() {
      const services = Store.getServices(Number(branchSel.value)).filter(s => s.active);
      serviceSel.innerHTML = services.map(s => `<option value="${s.id}">${App.esc(s.name)}</option>`).join("");
    }
    branchSel.addEventListener("change", fillServices);

    newBtn.addEventListener("click", () => {
      fillServices();
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = App.qs("#apptDate");
      dateInput.min = new Date().toISOString().split("T")[0];
      dateInput.value = tomorrow.toISOString().split("T")[0];
      Modal.open("apptModal");
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const branchId = Number(branchSel.value);
      const serviceId = Number(serviceSel.value);
      const dateStr = form.date.value, timeStr = form.time.value;
      if (!dateStr || !timeStr) { Toast.error("Missing details", "Please choose a date and time."); return; }
      const [hh, mm] = timeStr.split(":");
      const when = new Date(dateStr); when.setHours(Number(hh), Number(mm), 0, 0);
      if (when.getTime() < Date.now()) { Toast.error("Invalid time", "Please pick a future date and time."); return; }

      Store.update((data) => {
        data.appointments.push({
          id: data.meta.sequences.appointments++, userId: user.id, branchId, serviceId,
          date: when.toISOString(), status: "CONFIRMED", note: form.note.value.trim()
        });
        // Also drop a confirmation notification.
        const svc = data.services.find(s => s.id === serviceId);
        data.notifications.push({
          id: data.meta.sequences.notifications++, userId: user.id, type: "appt",
          title: "Appointment confirmed",
          message: `Your ${svc ? svc.name : "appointment"} on ${App.formatDate(when.toISOString())} at ${App.formatTime(when.toISOString())} is confirmed.`,
          read: false, createdAt: new Date().toISOString()
        });
      });
      Modal.close("apptModal");
      render();
      Toast.success("Appointment booked", "We've added it to your upcoming list.");
    });
  }
};
