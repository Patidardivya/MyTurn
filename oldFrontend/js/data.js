/* ============================================================
   MyTurn — Sample Data (data.js)
   ------------------------------------------------------------
   This file is our "database seed". Everything is plain JS
   objects/arrays with numeric IDs and foreign keys, so it maps
   almost 1:1 onto the future PostgreSQL tables:

     users, branches, services, counters, tokens,
     appointments, notifications, queue_events, analytics

   NOTE: We expose a build FUNCTION (not a static object) so that
   timestamps ("issued 12 minutes ago") are calculated relative to
   the moment the demo is first seeded. storage.js calls this once
   and then persists the result in localStorage.

   No frameworks. Loaded before storage.js in every page.
   ============================================================ */

(function () {
  "use strict";

  // Small helper: an ISO timestamp for "n minutes ago" from now.
  function minsAgo(n) {
    return new Date(Date.now() - n * 60 * 1000).toISOString();
  }
  // ISO for a specific calendar date (year, month 1-12, day, hour, min).
  function at(y, m, d, hh, mm) {
    return new Date(y, m - 1, d, hh || 9, mm || 0).toISOString();
  }

  /**
   * buildMyTurnSeed() -> full database object.
   * Called by Store.seed() the first time the app runs.
   */
  window.buildQueuelessSeed = function buildMyTurnSeed() {

    /* ---------------- USERS (table: users) ----------------
       role drives which dashboard the user lands on.
       passwords are PLAINTEXT here only because this is a DEMO
       with no backend — see auth.js for the security note.      */
    const users = [
      { id: 1, name: "Divya Patidar",  email: "user@myturn.demo",  phone: "+91 98765 43210", password: "user123",  role: "USER",  avatarColor: "logo-indigo", createdAt: at(2026, 6, 14) },
      { id: 2, name: "Rahul Verma",    email: "staff@myturn.demo", phone: "+91 98765 11223", password: "staff123", role: "STAFF", branchId: 1, counterId: 2, avatarColor: "logo-teal", createdAt: at(2026, 5, 2) },
      { id: 3, name: "Ananya Sharma",  email: "admin@myturn.demo", phone: "+91 98765 99887", password: "admin123", role: "ADMIN", avatarColor: "logo-violet", createdAt: at(2026, 3, 20) }
    ];

    /* ---------------- BRANCHES (table: branches) ----------------
       Realistic mix of the sectors MyTurn targets: hospital,
       bank, diagnostics lab, government office, university, salon. */
    const branches = [
      { id: 1, name: "City Care Hospital",        category: "Hospital",         area: "Indore Central",   city: "Indore", status: "OPEN",   openTime: "08:00", closeTime: "21:00", logo: "logo-indigo", initials: "CC" },
      { id: 2, name: "AxisPoint Bank",            category: "Bank",             area: "Vijay Nagar",      city: "Indore", status: "OPEN",   openTime: "10:00", closeTime: "17:00", logo: "logo-sky",    initials: "AP" },
      { id: 3, name: "Sunrise Diagnostics Lab",   category: "Diagnostics Lab",  area: "Palasia",          city: "Indore", status: "OPEN",   openTime: "07:00", closeTime: "20:00", logo: "logo-teal",   initials: "SD" },
      { id: 4, name: "RTO Regional Office",       category: "Government Office",area: "MG Road",          city: "Indore", status: "OPEN",   openTime: "10:00", closeTime: "18:00", logo: "logo-amber",  initials: "RT" },
      { id: 5, name: "Devi Ahilya University",    category: "College Office",   area: "Khandwa Road",     city: "Indore", status: "OPEN",   openTime: "09:00", closeTime: "17:00", logo: "logo-violet", initials: "DA" },
      { id: 6, name: "UrbanEdge Salon & Spa",     category: "Salon",            area: "Sapna Sangeeta",   city: "Indore", status: "CLOSED", openTime: "11:00", closeTime: "20:00", logo: "logo-rose",   initials: "UE" }
    ];

    /* ---------------- SERVICES (table: services) ----------------
       Each service tracks its OWN queue via:
         prefix      -> token label prefix (e.g. "Q")
         nowServing  -> number currently being served
         lastIssued  -> highest token number handed out so far
       waiting count for discovery cards = lastIssued - nowServing. */
    const services = [
      // City Care Hospital (branch 1)
      { id: 1,  branchId: 1, name: "General OPD",              prefix: "Q", avgServiceTime: 6,  counters: 3, priorityEnabled: true,  active: true, nowServing: 58, lastIssued: 71 },
      { id: 2,  branchId: 1, name: "Cardiology OPD",           prefix: "Q", avgServiceTime: 7,  counters: 2, priorityEnabled: true,  active: true, nowServing: 43, lastIssued: 48 },
      { id: 3,  branchId: 1, name: "Dermatology",              prefix: "Q", avgServiceTime: 8,  counters: 1, priorityEnabled: false, active: true, nowServing: 21, lastIssued: 27 },
      { id: 4,  branchId: 1, name: "Pediatrics",               prefix: "Q", avgServiceTime: 6,  counters: 2, priorityEnabled: true,  active: true, nowServing: 33, lastIssued: 39 },
      // AxisPoint Bank (branch 2)
      { id: 5,  branchId: 2, name: "Account Services",         prefix: "B", avgServiceTime: 9,  counters: 2, priorityEnabled: false, active: true, nowServing: 12, lastIssued: 19 },
      { id: 6,  branchId: 2, name: "Cash Deposit & Withdrawal",prefix: "B", avgServiceTime: 4,  counters: 3, priorityEnabled: false, active: true, nowServing: 40, lastIssued: 47 },
      { id: 7,  branchId: 2, name: "Loans & Mortgage",         prefix: "B", avgServiceTime: 15, counters: 1, priorityEnabled: false, active: true, nowServing: 4,  lastIssued: 7  },
      // Sunrise Diagnostics (branch 3)
      { id: 8,  branchId: 3, name: "Blood Sample Collection",  prefix: "S", avgServiceTime: 5,  counters: 3, priorityEnabled: true,  active: true, nowServing: 61, lastIssued: 68 },
      { id: 9,  branchId: 3, name: "X-Ray & Imaging",          prefix: "S", avgServiceTime: 12, counters: 1, priorityEnabled: false, active: true, nowServing: 15, lastIssued: 19 },
      { id: 10, branchId: 3, name: "Report Collection",        prefix: "S", avgServiceTime: 3,  counters: 2, priorityEnabled: false, active: true, nowServing: 52, lastIssued: 55 },
      // RTO Office (branch 4)
      { id: 11, branchId: 4, name: "Driving Licence",          prefix: "R", avgServiceTime: 12, counters: 2, priorityEnabled: false, active: true, nowServing: 28, lastIssued: 41 },
      { id: 12, branchId: 4, name: "Vehicle Registration",     prefix: "R", avgServiceTime: 14, counters: 2, priorityEnabled: false, active: true, nowServing: 17, lastIssued: 30 },
      // Devi Ahilya University (branch 5)
      { id: 13, branchId: 5, name: "Admissions Desk",          prefix: "U", avgServiceTime: 10, counters: 2, priorityEnabled: false, active: true, nowServing: 9,  lastIssued: 16 },
      { id: 14, branchId: 5, name: "Fee Payment",              prefix: "U", avgServiceTime: 5,  counters: 2, priorityEnabled: false, active: true, nowServing: 22, lastIssued: 27 },
      { id: 15, branchId: 5, name: "Transcript & Certificates",prefix: "U", avgServiceTime: 8,  counters: 1, priorityEnabled: false, active: false,nowServing: 0,  lastIssued: 0  },
      // UrbanEdge Salon (branch 6)
      { id: 16, branchId: 6, name: "Haircut & Styling",        prefix: "H", avgServiceTime: 25, counters: 3, priorityEnabled: false, active: true, nowServing: 6,  lastIssued: 9  },
      { id: 17, branchId: 6, name: "Spa & Massage",            prefix: "H", avgServiceTime: 40, counters: 2, priorityEnabled: false, active: true, nowServing: 2,  lastIssued: 4  }
    ];

    /* ---------------- COUNTERS (table: counters) ----------------
       Physical service points. Our demo staff (Rahul) runs
       Counter 2, which serves Cardiology OPD.                    */
    const counters = [
      { id: 1, branchId: 1, serviceId: 1, name: "Counter 1", staffId: null, status: "active" },
      { id: 2, branchId: 1, serviceId: 2, name: "Counter 2", staffId: 2,    status: "active" },
      { id: 3, branchId: 1, serviceId: 4, name: "Counter 3", staffId: null, status: "active" },
      { id: 4, branchId: 1, serviceId: 3, name: "Counter 4", staffId: null, status: "paused" }
    ];

    /* ---------------- TOKENS (table: tokens) ----------------
       type:   normal | appointment | emergency
       status: waiting | serving | completed | cancelled | skipped | no-show

       (A) LIVE queue for Cardiology OPD (serviceId 2) — the demo's
           focus. Divya's active token is #Q47.
       (B) Divya's HISTORY tokens (completed / cancelled / no-show)
           power the History page.                                */
    let tokenId = 100;
    const tokens = [
      // (A) --- Live Cardiology OPD queue (now serving Q43) ---
      { id: tokenId++, number: 40, code: "Q40", branchId: 1, serviceId: 2, userId: null, type: "normal",      status: "completed", counterId: 2, issuedAt: minsAgo(70), calledAt: minsAgo(62), completedAt: minsAgo(55) },
      { id: tokenId++, number: 41, code: "Q41", branchId: 1, serviceId: 2, userId: null, type: "appointment", status: "completed", counterId: 2, issuedAt: minsAgo(64), calledAt: minsAgo(54), completedAt: minsAgo(47) },
      { id: tokenId++, number: 42, code: "Q42", branchId: 1, serviceId: 2, userId: null, type: "normal",      status: "completed", counterId: 2, issuedAt: minsAgo(58), calledAt: minsAgo(46), completedAt: minsAgo(39) },
      { id: tokenId++, number: 43, code: "Q43", branchId: 1, serviceId: 2, userId: null, type: "normal",      status: "serving",   counterId: 2, issuedAt: minsAgo(51), calledAt: minsAgo(6),  completedAt: null },
      { id: tokenId++, number: 44, code: "Q44", branchId: 1, serviceId: 2, userId: null, type: "normal",      status: "waiting",   counterId: null, issuedAt: minsAgo(44), calledAt: null, completedAt: null },
      { id: tokenId++, number: 45, code: "Q45", branchId: 1, serviceId: 2, userId: null, type: "appointment", status: "waiting",   counterId: null, issuedAt: minsAgo(36), calledAt: null, completedAt: null },
      { id: tokenId++, number: 46, code: "Q46", branchId: 1, serviceId: 2, userId: null, type: "normal",      status: "waiting",   counterId: null, issuedAt: minsAgo(29), calledAt: null, completedAt: null },
      // Divya's ACTIVE token:
      { id: tokenId++, number: 47, code: "Q47", branchId: 1, serviceId: 2, userId: 1,    type: "normal",      status: "waiting",   counterId: null, issuedAt: minsAgo(25), calledAt: null, completedAt: null },
      // An emergency to demonstrate priority handling on the staff dashboard:
      { id: tokenId++, number: 48, code: "Q48", branchId: 1, serviceId: 2, userId: null, type: "emergency",   status: "waiting",   counterId: null, issuedAt: minsAgo(10), calledAt: null, completedAt: null },

      // (B) --- Divya's history (userId 1) ---
      { id: tokenId++, number: 32, code: "Q32", branchId: 1, serviceId: 1,  userId: 1, type: "normal",      status: "completed", counterId: 1, waitMinutes: 18, serviceMinutes: 6,  issuedAt: at(2026, 8, 20, 10, 15), completedAt: at(2026, 8, 20, 10, 39) },
      { id: tokenId++, number: 18, code: "B18", branchId: 2, serviceId: 5,  userId: 1, type: "appointment", status: "completed", counterId: null, waitMinutes: 9,  serviceMinutes: 11, issuedAt: at(2026, 8, 14, 11, 30), completedAt: at(2026, 8, 14, 11, 50) },
      { id: tokenId++, number: 9,  code: "S09", branchId: 3, serviceId: 8,  userId: 1, type: "normal",      status: "completed", counterId: null, waitMinutes: 12, serviceMinutes: 5,  issuedAt: at(2026, 8, 8,  9, 5),   completedAt: at(2026, 8, 8,  9, 22) },
      { id: tokenId++, number: 27, code: "Q27", branchId: 1, serviceId: 3,  userId: 1, type: "normal",      status: "cancelled", counterId: null, waitMinutes: 30, serviceMinutes: 0,  issuedAt: at(2026, 8, 2,  16, 0),  completedAt: at(2026, 8, 2, 16, 30) },
      { id: tokenId++, number: 5,  code: "U05", branchId: 5, serviceId: 14, userId: 1, type: "normal",      status: "no-show",   counterId: null, waitMinutes: 15, serviceMinutes: 0,  issuedAt: at(2026, 7, 28, 12, 10), completedAt: at(2026, 7, 28, 12, 40) }
    ];

    /* ---------------- APPOINTMENTS (table: appointments) ---------------- */
    const appointments = [
      { id: 1, userId: 1, branchId: 1, serviceId: 2,  date: at(2026, 8, 28, 11, 30), status: "CONFIRMED", note: "Follow-up ECG review" },
      { id: 2, userId: 1, branchId: 3, serviceId: 8,  date: at(2026, 8, 30, 9, 0),   status: "CONFIRMED", note: "Fasting blood test" },
      { id: 3, userId: 1, branchId: 5, serviceId: 13, date: at(2026, 9, 3, 14, 0),   status: "PENDING",   note: "Document verification" },
      { id: 4, userId: 1, branchId: 1, serviceId: 1,  date: at(2026, 8, 12, 10, 0),  status: "COMPLETED", note: "General checkup" },
      { id: 5, userId: 1, branchId: 2, serviceId: 5,  date: at(2026, 8, 5, 15, 30),  status: "CANCELLED", note: "KYC update" }
    ];

    /* ---------------- NOTIFICATIONS (table: notifications) ---------------- */
    const notifications = [
      { id: 1, userId: 1, type: "queue",   title: "Token issued",        message: "Your token is now #Q47 for Cardiology OPD at City Care Hospital.", read: false, createdAt: minsAgo(25) },
      { id: 2, userId: 1, type: "queue",   title: "Queue update",        message: "You have 4 people ahead of you. Estimated wait is about 28 minutes.", read: false, createdAt: minsAgo(14) },
      { id: 3, userId: 1, type: "warning", title: "Your turn is near",   message: "Please stay nearby — your turn is approaching in a few minutes.",   read: false, createdAt: minsAgo(4) },
      { id: 4, userId: 1, type: "appt",    title: "Appointment confirmed",message: "Your appointment on 28 Aug 2026, 11:30 AM (Cardiology OPD) is confirmed.", read: true,  createdAt: minsAgo(180) },
      { id: 5, userId: 1, type: "success", title: "Visit completed",     message: "Thanks for visiting! Token #Q32 (General OPD) was completed.",     read: true,  createdAt: at(2026, 8, 20, 10, 40) }
    ];

    /* ---------------- QUEUE EVENTS (table: queue_events) ----------------
       An append-only audit log. In production this powers analytics and
       WebSocket broadcasts. Here we keep a short sample + append on actions. */
    const queueEvents = [
      { id: 1, serviceId: 2, tokenId: 103, action: "called",    at: minsAgo(6),  meta: "Counter 2" },
      { id: 2, serviceId: 2, tokenId: 102, action: "completed", at: minsAgo(39), meta: "Counter 2" },
      { id: 3, serviceId: 2, tokenId: 107, action: "issued",    at: minsAgo(25), meta: "self-service" }
    ];

    /* ---------------- ANALYTICS (table/materialized view: analytics) ----------------
       Pre-aggregated numbers for the admin dashboard charts. In production
       these would come from SQL GROUP BY queries / a reporting table.        */
    const analytics = {
      totals: { visitors: 482, completed: 421, cancelled: 31, noShows: 30, avgWait: 18, avgService: 7 },
      visitorsPerDay: [
        { day: "Mon", count: 62 }, { day: "Tue", count: 74 }, { day: "Wed", count: 58 },
        { day: "Thu", count: 81 }, { day: "Fri", count: 96 }, { day: "Sat", count: 71 }, { day: "Sun", count: 40 }
      ],
      avgWaitPerDay: [
        { day: "Mon", mins: 16 }, { day: "Tue", mins: 19 }, { day: "Wed", mins: 14 },
        { day: "Thu", mins: 22 }, { day: "Fri", mins: 27 }, { day: "Sat", mins: 20 }, { day: "Sun", mins: 11 }
      ],
      peakHours: [
        { hour: "9a", count: 34 }, { hour: "10a", count: 58 }, { hour: "11a", count: 71 },
        { hour: "12p", count: 49 }, { hour: "1p", count: 28 }, { hour: "2p", count: 40 },
        { hour: "3p", count: 63 }, { hour: "4p", count: 51 }, { hour: "5p", count: 30 }
      ],
      popularServices: [
        { name: "General OPD", count: 138 }, { name: "Cash Deposit", count: 96 },
        { name: "Blood Collection", count: 84 }, { name: "Cardiology OPD", count: 67 },
        { name: "Driving Licence", count: 52 }
      ],
      counterEfficiency: [
        { counter: "Counter 1", pct: 92 }, { counter: "Counter 2", pct: 87 },
        { counter: "Counter 3", pct: 78 }, { counter: "Counter 4", pct: 64 }
      ]
    };

    // meta.sequences: remembers the next id to hand out for new records,
    // so freshly created branches/services/tokens don't collide.
    const meta = {
      seededAt: new Date().toISOString(),
      sequences: { users: 4, branches: 7, services: 18, counters: 5, tokens: tokenId, appointments: 6, notifications: 6, queueEvents: 4 }
    };

    return { users, branches, services, counters, tokens, appointments, notifications, queueEvents, analytics, meta };
  };
})();
