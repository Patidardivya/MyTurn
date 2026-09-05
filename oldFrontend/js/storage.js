/* ============================================================
   MyTurn — Storage Layer (storage.js)
   ------------------------------------------------------------
   A tiny wrapper around localStorage that behaves like a very
   small "database + data-access layer".

   Why isolate this?
   -> Today it reads/writes localStorage.
   -> Later, each method here becomes a `fetch()` call to the
      REST API (Node + Express + PostgreSQL). The rest of the app
      keeps calling Store.getServices(), Store.saveToken(), etc.
      and never needs to know where the data actually lives.

   Loaded AFTER data.js and BEFORE every other script.
   ============================================================ */

const Store = (function () {
  "use strict";

  const DB_KEY      = "MyTurn_db";       // the whole demo database
  const SESSION_KEY = "MyTurn_session";  // the logged-in user
  const SEED_VERSION = 3;                   // bump to force a reseed after schema changes
  const VERSION_KEY = "MyTurn_seed_version";

  /* ---- low-level read/write of the whole DB object ---- */
  function readDB() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || null;
    } catch (e) {
      console.warn("MyTurn: could not parse DB, reseeding.", e);
      return null;
    }
  }
  function writeDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    // Let other open tabs / widgets know the data changed.
    // (In production this role is played by WebSocket messages.)
    document.dispatchEvent(new CustomEvent("MyTurn:change", { detail: { db } }));
  }

  /* ---- seeding ----
     Runs once. If the stored seed version is old, we reset so the
     demo always matches the current data.js schema.               */
  function seed(force) {
    const storedVersion = Number(localStorage.getItem(VERSION_KEY) || 0);
    if (force || !readDB() || storedVersion !== SEED_VERSION) {
      const fresh = window.buildMyTurnSeed();
      writeDB(fresh);
      localStorage.setItem(VERSION_KEY, String(SEED_VERSION));
    }
    return readDB();
  }

  function db() {
    return readDB() || seed(false);
  }

  /* ---- generic collection access ---- */
  function all(collection) {
    return (db()[collection] || []).slice(); // return a copy
  }
  function saveCollection(collection, arr) {
    const data = db();
    data[collection] = arr;
    writeDB(data);
  }
  // Get the next auto-increment id for a table and persist it.
  function nextId(collection) {
    const data = db();
    data.meta.sequences[collection] = (data.meta.sequences[collection] || 1) + 1;
    const id = data.meta.sequences[collection] - 1;
    // ensure at least 1 above the current max to avoid collisions
    writeDB(data);
    return id;
  }

  /* ============================================================
     ENTITY HELPERS — the "queries" the UI actually calls.
     Each of these is a natural future REST endpoint.
     ============================================================ */

  // --- branches ---
  const getBranches   = () => all("branches");
  const getBranch     = (id) => getBranches().find(b => b.id === Number(id)) || null;

  // --- services ---
  const getServices   = (branchId) => all("services").filter(s => branchId == null || s.branchId === Number(branchId));
  const getService    = (id) => all("services").find(s => s.id === Number(id)) || null;

  // --- counters ---
  const getCounters   = (branchId) => all("counters").filter(c => branchId == null || c.branchId === Number(branchId));
  const getCounter    = (id) => all("counters").find(c => c.id === Number(id)) || null;

  // --- tokens ---
  const getTokens     = () => all("tokens");
  const getToken      = (id) => getTokens().find(t => t.id === Number(id)) || null;
  const getServiceTokens = (serviceId) => getTokens().filter(t => t.serviceId === Number(serviceId));
  const getUserActiveToken = (userId) =>
    getTokens().find(t => t.userId === Number(userId) && (t.status === "waiting" || t.status === "serving")) || null;
  const getUserHistory = (userId) =>
    getTokens()
      .filter(t => t.userId === Number(userId) && ["completed", "cancelled", "no-show", "skipped"].includes(t.status))
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

  // --- appointments ---
  const getUserAppointments = (userId) =>
    all("appointments").filter(a => a.userId === Number(userId)).sort((a, b) => new Date(a.date) - new Date(b.date));

  // --- notifications ---
  const getUserNotifications = (userId) =>
    all("notifications").filter(n => n.userId === Number(userId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = (userId) => getUserNotifications(userId).filter(n => !n.read).length;

  // --- users / analytics ---
  const getUsers      = () => all("users");
  const getAnalytics  = () => db().analytics;

  /* ============================================================
     MUTATIONS — update() reads, lets you mutate, then saves once.
     Using a single function keeps writes consistent and makes the
     change-event fire exactly once per logical operation.
     ============================================================ */
  function update(mutator) {
    const data = db();
    mutator(data);               // caller edits the object in place
    writeDB(data);               // persist + broadcast
    return data;
  }

  // Convenience mutation used all over the app: replace one record
  // inside a collection (matched by id) and save.
  function upsert(collection, record) {
    return update((data) => {
      const arr = data[collection];
      const idx = arr.findIndex(r => r.id === record.id);
      if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], record);
      else arr.push(record);
    });
  }
  function remove(collection, id) {
    return update((data) => {
      data[collection] = data[collection].filter(r => r.id !== Number(id));
    });
  }

  /* ---- append to the audit log (queue_events) ---- */
  function logEvent(serviceId, tokenId, action, meta) {
    update((data) => {
      data.meta.sequences.queueEvents = (data.meta.sequences.queueEvents || 1) + 1;
      data.queueEvents.push({
        id: data.meta.sequences.queueEvents - 1,
        serviceId, tokenId, action, meta: meta || "", at: new Date().toISOString()
      });
    });
  }

  /* ============================================================
     SESSION (the logged-in user).
     Kept separate from the DB. In production this becomes a JWT
     stored in memory / httpOnly cookie — see auth.js.
     ============================================================ */
  function setSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  /* ---- full reset (used by a "Reset demo data" button) ---- */
  function resetDemo() {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(VERSION_KEY);
    // keep the session so the user stays logged in after a reset
    seed(true);
  }

  // Public API
  return {
    seed, db, all, saveCollection, nextId,
    getBranches, getBranch,
    getServices, getService,
    getCounters, getCounter,
    getTokens, getToken, getServiceTokens, getUserActiveToken, getUserHistory,
    getUserAppointments,
    getUserNotifications, unreadCount,
    getUsers, getAnalytics,
    update, upsert, remove, logEvent,
    setSession, getSession, clearSession, resetDemo,
    SEED_VERSION
  };
})();

// Make sure the database exists as soon as this file loads.
Store.seed(false);
