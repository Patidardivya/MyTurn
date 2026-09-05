/* ============================================================
   MyTurn — Authentication (auth.js)
   ------------------------------------------------------------
   ⚠️  DEMO AUTHENTICATION ONLY  ⚠️
   This is NOT secure and must never be used in production:
     - passwords are compared in plain text in the browser
     - anyone can read the "session" from localStorage

   It exists so the prototype behaves like a real multi-role app
   without a backend yet.

   HOW THIS BECOMES REAL LATER (kept intentionally close):
     Auth.login()    -> POST /api/auth/login  -> returns a JWT
     Auth.register() -> POST /api/auth/register
     session         -> JWT in httpOnly cookie / memory
     requireAuth()   -> verify JWT + role on protected routes
   The rest of the app only calls Auth.currentUser() / requireAuth(),
   so swapping the internals will not touch the UI code.
   ============================================================ */

const Auth = (function () {
  "use strict";

  // The three demo accounts shown on the login screen.
  const demoAccounts = [
    { role: "USER",  email: "user@myturn.demo",  password: "user123"  },
    { role: "STAFF", email: "staff@myturn.demo", password: "staff123" },
    { role: "ADMIN", email: "admin@myturn.demo", password: "admin123" }
  ];

  // Where each role goes after logging in.
  function dashboardFor(role) {
    switch (role) {
      case "ADMIN": return "admin-dashboard.html";
      case "STAFF": return "staff-dashboard.html";
      default:      return "user-dashboard.html";
    }
  }

  /**
   * login(email, password) -> { ok, user?, error? }
   * DEMO: looks the user up in our seeded "users" table.
   * REAL: this becomes an async POST returning a signed token.
   */
  function login(email, password) {
    email = (email || "").trim().toLowerCase();
    const user = Store.getUsers().find(u => u.email.toLowerCase() === email);

    if (!user)                       return { ok: false, error: "No account found with that email." };
    if (user.password !== password)  return { ok: false, error: "Incorrect password. Please try again." };

    // Store a lightweight copy as the session (never keep the password).
    const safeUser = stripPassword(user);
    Store.setSession(safeUser);
    return { ok: true, user: safeUser };
  }

  /**
   * register(form) -> { ok, user?, error?, fieldErrors? }
   * Creates a USER account in the demo DB and logs them in.
   */
  function register(form) {
    const fieldErrors = {};
    const name  = (form.name  || "").trim();
    const email = (form.email || "").trim().toLowerCase();
    const phone = (form.phone || "").trim();
    const pw    = form.password || "";
    const pw2   = form.confirmPassword || "";

    if (name.length < 2)                 fieldErrors.name = "Please enter your full name.";
    if (!isValidEmail(email))            fieldErrors.email = "Enter a valid email address.";
    if (!isValidPhone(phone))            fieldErrors.phone = "Enter a valid 10-digit phone number.";
    if (pw.length < 6)                   fieldErrors.password = "Password must be at least 6 characters.";
    if (pw !== pw2)                      fieldErrors.confirmPassword = "Passwords do not match.";

    if (Store.getUsers().some(u => u.email.toLowerCase() === email))
      fieldErrors.email = "An account with this email already exists.";

    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

    // Create + persist the new user.
    const id = Store.nextId("users");
    const newUser = {
      id, name, email, phone, password: pw, role: "USER",
      avatarColor: "logo-sky", createdAt: new Date().toISOString()
    };
    Store.update((data) => data.users.push(newUser));

    const safeUser = stripPassword(newUser);
    Store.setSession(safeUser);
    return { ok: true, user: safeUser };
  }

  function logout() {
    Store.clearSession();
    window.location.href = "login.html";
  }

  function currentUser()  { return Store.getSession(); }
  function isLoggedIn()   { return !!currentUser(); }

  /**
   * requireAuth(allowedRoles) — page guard.
   * Call at the top of every protected page. If the visitor is not
   * logged in, or has the wrong role, redirect appropriately.
   * Returns the current user when access is granted.
   */
  function requireAuth(allowedRoles) {
    const user = currentUser();
    if (!user) { window.location.href = "login.html"; return null; }
    if (allowedRoles && allowedRoles.length && !allowedRoles.includes(user.role)) {
      // Logged in but on the wrong dashboard -> send to their own.
      window.location.href = dashboardFor(user.role);
      return null;
    }
    return user;
  }

  // Update the stored session + users table (used by the Profile page).
  function updateProfile(changes) {
    const user = currentUser();
    if (!user) return null;
    const updated = Object.assign({}, user, changes);
    Store.setSession(updated);
    Store.update((data) => {
      const u = data.users.find(x => x.id === user.id);
      if (u) Object.assign(u, changes);
    });
    return updated;
  }

  /* ---- small validators (reused by forms) ---- */
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isValidPhone(v) { return /^[+\d][\d\s-]{8,15}$/.test(v); }
  function stripPassword(u) { const c = Object.assign({}, u); delete c.password; return c; }

  return {
    demoAccounts, dashboardFor,
    login, register, logout,
    currentUser, isLoggedIn, requireAuth, updateProfile,
    isValidEmail, isValidPhone
  };
})();
