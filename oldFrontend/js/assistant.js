/* ============================================================
   MyTurn 2.0 — MyTurn Assistant (assistant.js)
   ------------------------------------------------------------
   A smart rule-based assistant widget that reads real user data
   from localStorage to answer queue-related questions.

   ARCHITECTURE:
     User message
       ↓
     Assistant.respond(message)     ← rule-based logic (this file)
       ↓
     Queue/Appointment data from Store (localStorage)
       ↓
     Response string

   FUTURE AI INTEGRATION:
     Replace the Assistant.respond() function body with:

       async function respond(message) {
         // Future: POST to your secure backend endpoint.
         // Never expose API keys in frontend JavaScript.
         //
         // const res = await fetch('/api/assistant', {
         //   method: 'POST',
         //   headers: { 'Content-Type': 'application/json' },
         //   body: JSON.stringify({ message, userId: currentUserId })
         // });
         // const { reply } = await res.json();
         // return reply;
       }
   ============================================================ */

const Assistant = (function () {
  "use strict";

  // ---- DOM references ----
  const FAB_ID   = "asstFab";
  const PANEL_ID = "asstPanel";

  // ---- Session chat history ----
  let chatHistory = [];

  // ---- Suggested questions shown initially ----
  const SUGGESTIONS = [
    "Where is my token?",
    "How long is my wait?",
    "How many people ahead?",
    "Cancel my queue",
    "Upcoming appointment"
  ];

  /* ------------------------------------------------------------------
     RESPONSE ENGINE
     
     Takes the user's message string, matches it against patterns,
     reads from localStorage (via Store/Auth) and returns a string reply.
     ------------------------------------------------------------------ */
  function respond(message) {
    const msg = (message || "").toLowerCase().trim();

    /* ---- Try to get the logged-in user and their active token ---- */
    let user  = null;
    let token = null;
    let nextAppt = null;

    try {
      if (typeof Auth !== "undefined") user = Auth.currentUser();
      if (user && typeof Store !== "undefined") {
        const data = Store.getData();

        // Find the user's active (waiting/serving) token
        token = data.tokens.find(t =>
          t.userId === user.id && (t.status === "waiting" || t.status === "serving")
        );

        // Find the user's next upcoming appointment
        const now = Date.now();
        const upcoming = data.appointments
          .filter(a => a.userId === user.id && a.status === "CONFIRMED" && new Date(a.date).getTime() > now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        nextAppt = upcoming[0] || null;
      }
    } catch (e) {
      // Store or Auth not available (e.g., landing page guest)
    }

    /* ---- Helper: get service + branch names ---- */
    function getServiceName(serviceId) {
      try { return Store.getService(serviceId)?.name || "the service"; } catch { return "the service"; }
    }
    function getBranchName(branchId) {
      try { return Store.getBranch(branchId)?.name || "the branch"; } catch { return "the branch"; }
    }

    /* ---- Response rules — ordered by specificity ---- */

    // Greeting
    if (/^(hi|hello|hey|good morning|good afternoon|namaste|hola)/.test(msg)) {
      const name = user ? `, ${user.name.split(" ")[0]}` : "";
      return `Hello${name}! 👋 I'm the MyTurn Assistant. I can help you with your queue status, appointments, cancellations, and more. What would you like to know?`;
    }

    // Token / queue status
    if (/\b(token|my token|queue|where|position|place|spot)\b/.test(msg)) {
      if (!user)  return "Please log in to check your token status. You can log in at the login page.";
      if (!token) return "You don't have an active token right now. Head to your dashboard to join a queue! 🎫";

      const service = getServiceName(token.serviceId);
      const branch  = getBranchName(token.branchId);
      try {
        const data     = Store.getData();
        const service2 = data.services.find(s => s.id === token.serviceId);
        const ahead    = service2 ? Math.max(0, token.number - service2.nowServing - 1) : "?";
        const nowS     = service2 ? service2.prefix + service2.nowServing : "?";
        return `Your token is <strong>${token.code}</strong> for ${service} at ${branch}.\n\nCurrently serving: <strong>${nowS}</strong>\nPeople ahead of you: <strong>${ahead}</strong>`;
      } catch {
        return `Your active token is <strong>${token.code}</strong> for ${service} at ${branch}.`;
      }
    }

    // Wait time
    if (/\b(wait|how long|time|minutes|estimate|eta)\b/.test(msg)) {
      if (!user)  return "Log in to see your estimated wait time.";
      if (!token) return "You don't have an active token. Join a queue first to see your wait time.";

      try {
        const data     = Store.getData();
        const service  = data.services.find(s => s.id === token.serviceId);
        if (!service) return "I couldn't find your queue information right now.";

        const ahead    = Math.max(0, token.number - service.nowServing - 1);
        const waitMins = Math.round((ahead * service.avgServiceTime) / service.counters);
        const serviceName = service.name;

        if (ahead === 0) return `Great news! 🎉 Your token <strong>${token.code}</strong> is next in line for ${serviceName}. Please head to the counter now!`;
        return `You are at position <strong>${ahead + 1}</strong> in the queue for ${serviceName}.\n\nWith <strong>${ahead}</strong> people ahead and an average service time of ${service.avgServiceTime} min, your estimated wait is approximately <strong>${waitMins} minutes</strong>. 🕐`;
      } catch {
        return `I'm having trouble reading your queue data right now. Please check your dashboard for the latest wait time.`;
      }
    }

    // How many people ahead
    if (/\b(ahead|people|before me|in front|how many)\b/.test(msg)) {
      if (!user)  return "Please log in to check your queue position.";
      if (!token) return "You're not in any queue right now.";

      try {
        const data    = Store.getData();
        const service = data.services.find(s => s.id === token.serviceId);
        if (!service) return "I couldn't retrieve your queue details.";

        const ahead = Math.max(0, token.number - service.nowServing - 1);
        if (ahead === 0) return "🎉 You're next! No one is ahead of you. Please go to the counter.";
        return `There are <strong>${ahead} ${ahead === 1 ? "person" : "people"}</strong> ahead of you in the queue.`;
      } catch {
        return "I couldn't check the queue status right now. Please refresh your dashboard.";
      }
    }

    // Cancel queue
    if (/\b(cancel|leave|exit|quit|drop|remove)\b/.test(msg) && /\b(queue|token|line)\b/.test(msg)) {
      if (!user)  return "Please log in to manage your queue.";
      if (!token) return "You don't have an active token to cancel.";
      return `To cancel your token <strong>${token.code}</strong>, go to your <a href="queue.html" style="color:var(--brand-600);font-weight:600">My Queue page</a> and tap the "Cancel Token" button. Your spot will be released immediately.`;
    }

    // Appointment
    if (/\b(appointment|book|schedule|reschedule|slot|upcoming)\b/.test(msg)) {
      if (!user) return "Please log in to check your appointments.";
      if (!nextAppt) return "You don't have any upcoming confirmed appointments. You can book one from your dashboard!";

      try {
        const service  = getServiceName(nextAppt.serviceId);
        const branch   = getBranchName(nextAppt.branchId);
        const date     = new Date(nextAppt.date);
        const dateStr  = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const timeStr  = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `Your next appointment is for <strong>${service}</strong> at ${branch}.\n📅 <strong>${dateStr}</strong> at <strong>${timeStr}</strong>\n\nTo reschedule, visit your <a href="appointments.html" style="color:var(--brand-600);font-weight:600">Appointments page</a>.`;
      } catch {
        return "You have an upcoming appointment. Visit your Appointments page for details.";
      }
    }

    // Notifications
    if (/\b(notification|alert|message|update|notify)\b/.test(msg)) {
      if (!user) return "Log in to see your notifications.";
      try {
        const unread = Store.unreadCount(user.id);
        if (unread === 0) return "✅ You're all caught up! No unread notifications.";
        return `You have <strong>${unread} unread notification${unread > 1 ? "s" : ""}</strong>. Check your <a href="notifications.html" style="color:var(--brand-600);font-weight:600">Notifications page</a> to view them.`;
      } catch {
        return "Visit your Notifications page to see your alerts.";
      }
    }

    // Status meanings
    if (/\b(status|mean|meaning|what does|serving|waiting)\b/.test(msg)) {
      return `Here's what queue statuses mean:<br><br>
        🟡 <strong>Waiting</strong> — You're in the queue. Track your position live.<br>
        🟢 <strong>Serving</strong> — You're currently being served at the counter.<br>
        ✅ <strong>Completed</strong> — Your visit is done.<br>
        ❌ <strong>Cancelled</strong> — You or staff cancelled your token.<br>
        ⚠️ <strong>No-show</strong> — Your token was called but you weren't there.`;
    }

    // How to get a token
    if (/\b(how|get|take|join|start|begin|digital)\b/.test(msg) && /\b(token|queue|register|join)\b/.test(msg)) {
      return `Getting a token is easy! Here's how:<br><br>
        <strong>1.</strong> Go to your <a href="user-dashboard.html" style="color:var(--brand-600);font-weight:600">Dashboard</a><br>
        <strong>2.</strong> Find a service center under "Find a Service"<br>
        <strong>3.</strong> Click <em>Join Queue</em><br>
        <strong>4.</strong> Select the service and tap <em>Get Digital Token</em><br><br>
        Your position is reserved instantly! 🎫`;
    }

    // Priority queue
    if (/\b(priority|emergency|urgent|fast|senior|disabled)\b/.test(msg)) {
      return `MyTurn supports priority queuing for emergencies and appointments. Emergency tokens are served before regular waiting tokens. Staff can also manage priority assignments from their counter dashboard.`;
    }

    // Mobile / app
    if (/\b(mobile|phone|app|download|install|android|ios)\b/.test(msg)) {
      return `MyTurn works entirely in your mobile browser — no app download needed! 📱 Just open the website, and it works perfectly on any smartphone. You can even add it to your home screen for quick access.`;
    }

    // Help / what can you do
    if (/\b(help|what can|options|commands|features|do for me)\b/.test(msg)) {
      return `Here's what I can help you with:<br><br>
        🎫 <strong>Token status</strong> — "Where is my token?"<br>
        ⏳ <strong>Wait time</strong> — "How long is my wait?"<br>
        👥 <strong>Queue position</strong> — "How many people ahead?"<br>
        ❌ <strong>Cancel queue</strong> — "Cancel my token"<br>
        📅 <strong>Appointments</strong> — "Show my appointment"<br>
        🔔 <strong>Notifications</strong> — "Any notifications?"<br>
        ℹ️ <strong>Status help</strong> — "What does serving mean?"<br><br>
        Just type your question naturally!`;
    }

    // Thank you
    if (/\b(thanks|thank you|great|perfect|awesome|nice|cool|got it|ok|okay)\b/.test(msg)) {
      return "You're welcome! 😊 Is there anything else I can help you with?";
    }

    // Default fallback
    return `I'm not sure I understood that. Try asking things like:<br><br>
      • "Where is my token?"<br>
      • "How long is my wait?"<br>
      • "Show my appointment"<br>
      • "How do I join a queue?"<br><br>
      Or type <strong>help</strong> to see everything I can do.`;
  }

  /* ------------------------------------------------------------------
     UI BUILDER — creates the floating button + chat panel
     ------------------------------------------------------------------ */
  function buildUI() {
    // Floating button
    const fab = document.createElement("button");
    fab.id = FAB_ID;
    fab.className = "asst-fab";
    fab.setAttribute("aria-label", "Open MyTurn Assistant");
    fab.setAttribute("title", "MyTurn Assistant");
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`;

    // Chat panel
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "assistant-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "MyTurn Assistant");
    panel.innerHTML = `
      <div class="asst-header">
        <div class="asst-header-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div>
          <div class="asst-header-title">MyTurn Assistant</div>
          <div class="asst-header-sub">Powered by MyTurn data</div>
        </div>
        <button class="asst-close" id="asstClose" aria-label="Close assistant">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="asst-messages" id="asstMessages"></div>
      <div class="asst-suggestions" id="asstSuggestions"></div>
      <div class="asst-input-row">
        <input class="asst-input" id="asstInput" type="text" placeholder="Ask me anything…" autocomplete="off" aria-label="Type your question">
        <button class="asst-send" id="asstSend" aria-label="Send message">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    return { fab, panel };
  }

  /* ------------------------------------------------------------------
     MESSAGE RENDERING
     ------------------------------------------------------------------ */
  function appendMessage(content, role) {
    const messagesEl = document.getElementById("asstMessages");
    if (!messagesEl) return;

    const now  = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const wrap = document.createElement("div");
    wrap.className = `asst-msg ${role}`;
    wrap.innerHTML = `
      <div class="asst-bubble">${content}</div>
      <div class="asst-msg-time">${now}</div>`;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    chatHistory.push({ role, content });
  }

  function showTyping() {
    const messagesEl = document.getElementById("asstMessages");
    if (!messagesEl) return null;
    const el = document.createElement("div");
    el.className = "asst-msg bot";
    el.id = "asstTyping";
    el.innerHTML = `<div class="asst-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function renderSuggestions(chips) {
    const el = document.getElementById("asstSuggestions");
    if (!el) return;
    el.innerHTML = chips.map(c =>
      `<button class="asst-sugg-chip" data-q="${c}">${c}</button>`
    ).join("");
    el.querySelectorAll(".asst-sugg-chip").forEach(btn => {
      btn.addEventListener("click", () => handleUserMessage(btn.getAttribute("data-q")));
    });
  }

  /* ------------------------------------------------------------------
     HANDLE USER MESSAGE
     ------------------------------------------------------------------ */
  function handleUserMessage(text) {
    text = (text || "").trim();
    if (!text) return;

    // Clear input
    const input = document.getElementById("asstInput");
    if (input) input.value = "";

    // Hide suggestions after first message
    renderSuggestions([]);

    // Show user message
    appendMessage(text, "user");

    // Show typing indicator
    const typing = showTyping();

    // Simulate a small response delay (feels more natural)
    setTimeout(() => {
      if (typing) typing.remove();

      // --- FUTURE AI INTEGRATION POINT ---
      // Replace the line below with an async fetch to your backend:
      //   const reply = await callAIBackend(text);
      // See the top of this file for the integration pattern.
      const reply = respond(text);

      appendMessage(reply, "bot");

      // Show follow-up suggestions after bot response
      setTimeout(() => {
        renderSuggestions(["Where is my token?", "My appointment", "Cancel queue"]);
      }, 400);
    }, 600 + Math.random() * 400);
  }

  /* ------------------------------------------------------------------
     PANEL OPEN / CLOSE
     ------------------------------------------------------------------ */
  function openPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.classList.add("open", "opening");
    setTimeout(() => panel.classList.remove("opening"), 300);

    // Show welcome message on first open
    const messagesEl = document.getElementById("asstMessages");
    if (messagesEl && messagesEl.children.length === 0) {
      const name = (() => { try { return Auth.currentUser()?.name?.split(" ")[0] || ""; } catch { return ""; } })();
      appendMessage(`Hi${name ? " " + name : ""}! 👋 I'm your MyTurn Assistant. I can help you with queue status, wait times, appointments, and more.`, "bot");
      renderSuggestions(SUGGESTIONS);
    }

    // Focus the input
    setTimeout(() => {
      const inp = document.getElementById("asstInput");
      if (inp) inp.focus();
    }, 300);
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.classList.add("closing");
    setTimeout(() => {
      panel.classList.remove("open", "closing");
    }, 220);
  }

  /* ------------------------------------------------------------------
     WIRE EVENTS
     ------------------------------------------------------------------ */
  function wireEvents() {
    const fab   = document.getElementById(FAB_ID);
    const panel = document.getElementById(PANEL_ID);

    if (fab) fab.addEventListener("click", () => {
      const isOpen = panel && panel.classList.contains("open");
      isOpen ? closePanel() : openPanel();
    });

    const closeBtn = document.getElementById("asstClose");
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    const input  = document.getElementById("asstInput");
    const sendBtn = document.getElementById("asstSend");

    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleUserMessage(input.value);
        }
      });
    }
    if (sendBtn) {
      sendBtn.addEventListener("click", () => {
        if (input) handleUserMessage(input.value);
      });
    }

    // Close on Escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && panel && panel.classList.contains("open")) {
        closePanel();
      }
    });
  }

  /* ------------------------------------------------------------------
     PUBLIC INIT — call once per page
     ------------------------------------------------------------------ */
  function init() {
    buildUI();
    wireEvents();
  }

  /* Allow programmatic opening (e.g., from command menu or assistant promo) */
  function open()  { openPanel(); }
  function close() { closePanel(); }

  return { init, open, close, respond };
})();

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  Assistant.init();
});
