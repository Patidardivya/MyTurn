# MyTurn — Smart Digital Queue Management System

> **One Token. Zero Standing.**

MyTurn is a web app that replaces physical waiting lines with a **digital queue**. Visitors take a token from their phone, watch their position and estimated wait update in real time, and walk in only when it's nearly their turn. Staff run their counter from a live console, and admins manage branches, services, and see performance analytics.

This repository is a **complete, front-end-only prototype** built with plain **HTML, CSS, and vanilla JavaScript** — no frameworks, no build step. It is deliberately structured so a real backend (Node/Express, PostgreSQL, Redis, WebSockets, JWT) can be dropped in later **without rewriting the UI**.

---

## Table of contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Demo accounts](#6-demo-accounts)
7. [How it works (core logic)](#7-how-it-works-core-logic)
8. [Data model](#8-data-model)
9. [From prototype to production](#9-from-prototype-to-production)
10. [Design system & accessibility](#10-design-system--accessibility)
11. [Roadmap & known limitations](#11-roadmap--known-limitations)
12. [Credits & license](#12-credits--license)

---

## 1. Overview

Waiting in line is one of the most common everyday frustrations — at hospitals, banks, labs, government offices, campuses, and salons. People burn time standing around with no idea how long they'll wait or whether they'll miss their turn if they step away.

**MyTurn digitizes the line.** Instead of a paper token and a crowded waiting room:

- A visitor finds a nearby branch, picks a service, and takes a **digital token**.
- They see their **live position**, **people ahead**, and an **estimated wait time**.
- They can track it from anywhere and cancel if plans change.
- Staff call the next person, complete/skip/recall tokens, and the whole queue re-orders instantly.
- Admins configure branches and services and watch throughput on a dashboard.

The prototype simulates all the "real-time" behaviour in the browser so you can experience the full product without a server.

---

## 2. Features

### For visitors (USER role)
- **Find service centers** by category (Hospital, Bank, Diagnostics Lab, Government Office, College Office, Salon) with live "people waiting" counts.
- **Take a digital token** for any active service, with a live preview of position and ETA before you commit.
- **Track your queue** in real time: token number, people ahead, estimated wait, which counter is serving, and a progress timeline.
- **Cancel** a token with a confirmation step.
- **Book appointments** for a future date/time (these get priority in the queue).
- **History** of past visits (completed / cancelled / no-show) with filters.
- **Notifications** for queue updates, "you're next" alerts, and appointment confirmations.
- **Profile** management (edit details, change password, reset the demo data).

### For staff (STAFF role)
- A **queue console** tied to the staff member's counter and service.
- **Live stats**: people waiting, now serving, served today, estimated wait for a new joiner.
- Four clear actions — **Call Next**, **Complete**, **Recall**, **Skip** — driven by a simple state machine so buttons enable/disable correctly.
- A **priority-ordered queue table** showing who's next and why.

### For admins (ADMIN role)
- **Overview KPIs**: visitors, completion rate, average wait, active branches.
- **Analytics charts** (drawn with pure CSS/JS, no chart library): visitors per day, peak hours, most popular services, counter efficiency, and a visit-outcome donut.
- **Branch management**: add and remove branches (add via a modal form).
- **Service management**: add, edit, and remove services, including counters, average service time, and priority handling.

### Cross-cutting UX
Loading states, empty states, confirmation dialogs, success/error **toast** notifications, hover and disabled states, inline **form validation**, responsive navigation, and a keyboard-friendly, screen-reader-conscious layout.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Markup | **HTML5** (semantic) | Accessible, framework-free |
| Styling | **CSS3** with custom properties | A themeable design system, no Tailwind/Bootstrap |
| Logic | **Vanilla JavaScript (ES6+)** | No React/Vue; readable for anyone learning JS |
| "Database" | **localStorage** | Persists demo state in the browser; swappable for a REST API |
| Icons | **Inline SVG** | No icon-font dependency; ships in the JS |
| Fonts | **Inter** (system fallback) | Clean, professional SaaS look |

**There is no build step and there are zero runtime dependencies.** Everything runs from static files. This is intentional: the only external resource is a Google Fonts link for Inter, and the app degrades gracefully to system fonts if it's offline.

> **Why no framework?** The goal was a codebase that's easy to read and learn from, and a clean seam between the UI and the data layer. All data access goes through a single `Store` object (in `js/storage.js`). Replacing localStorage with `fetch()` calls to a real API is a change to *that one file*, not the whole app.

---

## 4. Project structure

```
MyTurn/
├── index.html              # Landing page (marketing + product story)
├── login.html              # Sign in (with demo-account quick-fill)
├── register.html           # Create account (with live validation)
├── user-dashboard.html     # Visitor home: overview + find services
├── queue.html              # Live queue tracking for the visitor
├── appointments.html       # Book & manage appointments
├── history.html            # Past visits, filterable
├── notifications.html      # Notification center
├── profile.html            # Account settings + reset demo data
├── staff-dashboard.html    # Staff queue console
├── admin-dashboard.html    # Admin analytics + branch/service management
│
├── css/
│   ├── style.css           # Design tokens + base components (buttons, cards, forms, modals…)
│   ├── dashboard.css        # App shell: sidebar, topbar, stats, tables, charts, console
│   └── responsive.css       # Breakpoints, mobile sidebar drawer, tables→cards, print
│
├── js/
│   ├── data.js             # Seed "database": users, branches, services, counters, tokens…
│   ├── storage.js          # Store: the data-access layer over localStorage (the API seam)
│   ├── auth.js             # Demo auth (login/register/logout/guards) — JWT-shaped
│   ├── app.js              # Shared UI: icons, toasts, modals, chrome, page router
│   ├── queue.js            # QueueEngine (priority + ETA) + visitor dashboard/queue pages
│   ├── appointments.js     # Appointments page controller
│   ├── staff.js            # Staff console controller
│   └── admin.js            # Admin dashboard controller (KPIs, charts, management)
│
├── assets/
│   └── images/
│       ├── favicon.svg     # Browser tab icon (the "Q" mark)
│       └── logo.svg        # MyTurn wordmark (reusable brand asset)
│
└── README.md
```

**Script load order** is the same on every page: `data.js → storage.js → auth.js → app.js → [page-specific].js`. Each page declares its identity on the `<body>` tag — e.g. `data-page="queue" data-roles="USER"` — and `app.js` reads that to enforce the route guard and run the matching page controller from a `window.Pages` registry.

---

## 5. Getting started

No install, no build, no server required.

**Option A — just open it**

1. Download or clone this folder.
2. Double-click `index.html` (or open it in your browser).

**Option B — run a tiny local server** (recommended, avoids any browser file:// quirks)

```bash
# From inside the MyTurn/ folder:

# Python 3
python -m http.server 5500

# …or Node (if you have it)
npx serve .
```

Then visit `http://localhost:5500`.

The first time it loads, MyTurn seeds a realistic demo database into your browser's `localStorage`. You can wipe and re-seed it any time from **Profile → Reset demo data**.

---

## 6. Demo accounts

Use these on the **login** page (or click the quick-fill links there). They are clearly marked as demo credentials and exist only because there is no backend yet.

| Role | Email | Password | Lands on |
|---|---|---|---|
| Visitor | `user@MyTurn.com` | `user123` | User dashboard |
| Staff | `staff@MyTurn.com` | `staff123` | Staff console |
| Admin | `admin@MyTurn.com` | `admin123` | Admin overview |

> ⚠️ **Security note:** passwords are stored in plain text in `js/data.js` **only because this is a front-end demo with no server**. In production, authentication moves to the backend, passwords are hashed (bcrypt/argon2), and the browser only ever holds a short-lived **JWT**. See [section 9](#9-from-prototype-to-production).

---

## 7. How it works (core logic)

All queue logic lives in **`QueueEngine`** (in `js/queue.js`) so it's isolated, testable, and easy to move server-side later.

### Taking a token (safe issuing)
`issueToken(serviceId, userId, type)` increments the service's `lastIssued` counter and creates a token record. In the browser this is a single synchronous step. The code includes a comment marking where, in a real database, this must be an **atomic transaction** (e.g. `UPDATE … RETURNING`, or a sequence) so two people can't grab the same number under concurrency.

### Estimated wait time
Kept in its own function so it can be upgraded independently:

```js
calculateEstimatedWait(peopleAhead, averageServiceTime, activeCounters = 1)
  = round(peopleAhead × averageServiceTime / activeCounters)
```

Today it's a simple formula. Tomorrow it could use rolling averages or an ML model — the callers don't change.

### Priority algorithm (with anti-starvation aging)
Real queues aren't pure first-come-first-served: emergencies and booked appointments should jump ahead. But naive priority can **starve** normal visitors (someone always cuts in front). MyTurn solves this with **waiting-time aging**, a classic scheduling technique:

```
TYPE_WEIGHT = { emergency: 0, appointment: 100, normal: 200 }   // lower = higher priority
AGING_PER_MIN = 6                                                // points earned per minute waited

effectiveScore(token) = TYPE_WEIGHT[token.type] − (minutesWaited × 6)
```

Tokens are sorted by `effectiveScore` ascending. Emergencies start well ahead, but a normal token that has waited long enough steadily climbs and will eventually be served — **no one waits forever.** The weights and aging rate are constants you can tune in one place.

### Real-time simulation (the WebSocket stand-in)
Because there's no server pushing updates, the app fakes "live" behaviour:

- The visitor's **My Queue** page runs a timer that periodically advances the service (people get served), so you can watch your position and ETA drop.
- State changes fire a `MyTurn:change` **CustomEvent**, and a cross-tab `storage` listener means an action in one tab (e.g. staff calling the next token) updates other open tabs.

Both of these are exactly where a real **WebSocket** subscription would plug in — the UI already knows how to react to "something changed."

---

## 8. Data model

The demo "database" is a set of plain JS objects/arrays in `js/data.js`, using numeric IDs and foreign keys so it maps almost 1:1 onto future **PostgreSQL** tables:

| Collection | Represents | Key fields / relationships |
|---|---|---|
| `users` | Accounts | `id`, `role` (USER/STAFF/ADMIN), `branchId?`, `counterId?` |
| `branches` | Locations | `id`, `category`, `status`, hours |
| `services` | Queues within a branch | `id`, `branchId→branches`, `avgServiceTime`, `counters`, `priorityEnabled`, `nowServing`, `lastIssued` |
| `counters` | Service points | `id`, `branchId`, `serviceId`, `staffId` |
| `tokens` | Issued queue tickets | `id`, `serviceId`, `userId?`, `type`, `status`, timestamps |
| `appointments` | Future bookings | `id`, `userId`, `serviceId`, date/time |
| `notifications` | User alerts | `id`, `userId`, `read` |
| `queueEvents` | Append-only audit log | powers analytics in production |
| `analytics` | Pre-aggregated reporting numbers | stands in for SQL `GROUP BY` / a reporting view |
| `meta.sequences` | Next-ID counters | mimics DB auto-increment/sequences |

Every read/write goes through the **`Store`** object in `js/storage.js` (`getBranches()`, `getService(id)`, `update(mutator)`, `remove(collection, id)`, …). That object is the single seam between the app and its data.

---

## 9. From prototype to production

The front end was built to survive the addition of a real backend. Here's the upgrade path, and why each step is low-risk:

1. **Swap the data layer.** Reimplement the methods in `js/storage.js` to call a REST API with `fetch()` instead of reading localStorage. The rest of the app calls `Store.*` and doesn't care what's underneath.
   - `Store.getServices()` → `GET /api/services`
   - `Store.issueToken()` → `POST /api/tokens`
   - `Store.update()` → the relevant `PATCH`/`PUT`/`DELETE`

2. **Move auth to the server.** `js/auth.js` is already shaped like a JWT client: `login()` → `POST /api/auth/login` returns a token; `requireAuth(roles)` verifies it. Hash passwords server-side; store only the JWT in the browser.

3. **Make it truly real-time.** Replace the simulation timer and `storage` events with a **WebSocket** connection. The UI already listens for a "state changed" signal (`MyTurn:change`), so you mostly point that listener at socket messages.

4. **Persist and scale.** Back it with **PostgreSQL** (the tables in [section 8](#8-data-model)) and use **Redis** for hot queue state and pub/sub fan-out to WebSocket clients.

5. **Enforce concurrency.** Turn `issueToken`'s atomic-step comment into a real transaction/sequence so token numbers are unique under load.

Because the priority and ETA logic lives in `QueueEngine`, you can also lift it straight into the backend and have the browser simply render server-computed positions.

---

## 10. Design system & accessibility

**Design tokens.** Colours, radii, spacing, shadows, and typography are defined once as CSS custom properties in `css/style.css` (`--brand-600`, `--r-lg`, status colours, etc.). Re-skinning the whole app is a matter of editing those variables.

**Component library.** Buttons (primary/secondary/outline/ghost/danger/success + sizes), cards, badges, forms with validation styles, alerts, toasts, modals, progress bars, spinners, empty states, stat cards, tables, and charts — all hand-built and reused across pages.

**Charts without a library.** The admin analytics are drawn with CSS and a little JS: flexbox bar charts, `<div>`-based horizontal bars, and a CSS `conic-gradient` donut. No Chart.js, no D3 — nothing to download.

**Responsive.** A fluid layout with breakpoints at 1080/1024/900/768/520px. On small screens the sidebar becomes an off-canvas drawer and data tables **reflow into cards** using `data-label` attributes, so nothing overflows on a phone.

**Accessibility.**
- Semantic HTML landmarks (`header`, `main`, `nav`, `aside`) and real headings.
- Every input has a `<label>`; dialogs use `role="dialog"` + `aria-modal`.
- Meaning is never carried by colour alone — status also uses text/badges and icons.
- Keyboard-friendly controls and visible focus.
- Respects `prefers-reduced-motion` and includes print styles.

---

## 11. Roadmap & known limitations

**Current limitations (by design, because there's no backend):**
- Data lives in your browser's localStorage, so it's per-device and clears if you reset the demo.
- "Real-time" is simulated locally; multi-user sync only works across tabs in the same browser.
- Passwords are plain text in the seed file (demo only — see the security note).

**Natural next steps:**
- Real backend per [section 9](#9-from-prototype-to-production) (Express + PostgreSQL + Redis + WebSockets + JWT).
- SMS/WhatsApp/push notifications for "you're next."
- QR codes at the counter to join a queue instantly.
- Multi-language support.
- Richer analytics (wait-time distributions, no-show prediction).
- A native or PWA wrapper for offline-friendly mobile use.

---

## 12. Credits & license

Built as a portfolio project to demonstrate front-end engineering, UI/UX, and clean, backend-ready architecture using nothing but **HTML, CSS, and vanilla JavaScript**.

Brand: **MyTurn** — *One Token. Zero Standing.*

You're free to use, study, and adapt this project for learning and portfolio purposes.
