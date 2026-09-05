/* ============================================================
   MyTurn 2.0 — Animations (animations.js)
   ------------------------------------------------------------
   Provides:
     - initScrollReveal()  : IntersectionObserver fade-up for .reveal
     - initCountUp()       : count-up animation for stat numbers
     - initHeroMock()      : animated hero dashboard mockup
     - initLiveActivity()  : rotating live activity feed
     - initNavScroll()     : navbar shadow on scroll
     - initStepsLine()     : animated connector line in How It Works

   All functions are safe to call multiple times (they check for
   elements before running). Loaded after app.js on landing page.
   ============================================================ */

/* ----------------------------------------------------------------
   1. SCROLL REVEAL
   Elements with class="reveal" fade-up into view when they enter
   the viewport. Add data-delay="1" to "5" for staggered children.
   ---------------------------------------------------------------- */
function initScrollReveal() {
  // Do nothing if the user prefers reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Just make all reveal elements visible immediately
    document.querySelectorAll(".reveal, .reveal-fade").forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target); // only trigger once
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal, .reveal-fade").forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------------
   2. COUNT-UP ANIMATION
   Animates numbers from 0 to their target value.
   
   Usage in HTML:
     <span class="count-target" data-target="50000" data-suffix="K+">50K+</span>
   
   Only triggers once when the element scrolls into view.
   ---------------------------------------------------------------- */
function initCountUp() {
  const targets = document.querySelectorAll(".count-target");
  if (!targets.length) return;

  // Easing: ease-out cubic
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function animateNumber(el) {
    const target    = parseFloat(el.getAttribute("data-target")) || 0;
    const suffix    = el.getAttribute("data-suffix") || "";
    const prefix    = el.getAttribute("data-prefix") || "";
    const decimals  = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals")) : 0;
    const duration  = 1800; // ms
    const start     = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = target * easeOut(progress);

      el.textContent = prefix + value.toFixed(decimals) + suffix;

      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(step);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateNumber(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  targets.forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------------
   3. HERO MOCK ANIMATION
   Simulates the queue advancing in the hero mockup card.
   Increments "Now Serving" every few seconds and updates stats.
   ---------------------------------------------------------------- */
function initHeroMock() {
  const servingEl = document.getElementById("mockServing");
  const aheadEl   = document.getElementById("mockAhead");
  const waitEl    = document.getElementById("mockWait");
  const progressEl = document.getElementById("mockProgressBar");
  const tokenEl   = document.getElementById("mockToken");

  if (!servingEl || !aheadEl) return;

  let serving = 43;
  const myToken = 47;

  function update() {
    serving++;
    if (serving >= myToken) serving = 40; // reset demo loop

    const ahead = Math.max(0, myToken - serving - 1);
    const wait  = ahead * 7;
    const progress = Math.min(100, Math.round((serving / myToken) * 100));

    // Animate the number change
    servingEl.classList.add("num-swap-out");
    setTimeout(() => {
      servingEl.textContent = "Q" + serving;
      servingEl.classList.remove("num-swap-out");
      servingEl.classList.add("num-swap-in");
      setTimeout(() => servingEl.classList.remove("num-swap-in"), 300);
    }, 200);

    if (aheadEl)    aheadEl.textContent   = ahead;
    if (waitEl)     waitEl.textContent    = wait + "m";
    if (progressEl) progressEl.style.width = progress + "%";
    if (tokenEl) {
      const pctEl = tokenEl.closest(".mock-progress")?.querySelector(".mock-pct");
      if (pctEl) pctEl.textContent = progress + "%";
    }
  }

  // Update every 3 seconds for a lively feel
  const interval = setInterval(update, 3000);

  // Stop when page is hidden (tab switch) to save resources
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(interval);
  });
}

/* ----------------------------------------------------------------
   4. LIVE ACTIVITY FEED
   Cycles through a set of demo activity messages on the landing page.
   ---------------------------------------------------------------- */
function initLiveActivity() {
  const container = document.getElementById("liveActivityFeed");
  if (!container) return;

  const activities = [
    { dot: "live-dot-blue",   text: "<strong>City Care Hospital</strong> — Token Q-43 is now being served", time: "just now" },
    { dot: "live-dot-green",  text: "<strong>AxisPoint Bank</strong> — 12 people currently waiting", time: "2 min ago" },
    { dot: "live-dot-purple", text: "<strong>Indore Service Center</strong> — Average wait reduced by 18%", time: "4 min ago" },
    { dot: "live-dot-amber",  text: "<strong>Sunrise Diagnostics</strong> — Token S-68 called at Counter 3", time: "6 min ago" },
    { dot: "live-dot-blue",   text: "<strong>Devi Ahilya University</strong> — Admissions queue: 7 waiting", time: "8 min ago" },
    { dot: "live-dot-green",  text: "<strong>RTO Regional Office</strong> — Token R-41 served in 11 min", time: "10 min ago" },
  ];

  let current = 0;

  function renderItems() {
    container.innerHTML = "";
    // Show 3 items at a time
    for (let i = 0; i < 3; i++) {
      const idx  = (current + i) % activities.length;
      const item = activities[idx];
      const div  = document.createElement("div");
      div.className = "live-feed-item activity-item";
      div.style.animationDelay = (i * 0.1) + "s";
      div.innerHTML = `
        <span class="live-dot ${item.dot}"></span>
        <span class="lf-text">${item.text}</span>
        <span class="lf-time">${item.time}</span>`;
      container.appendChild(div);
    }
  }

  renderItems();
  setInterval(() => {
    current = (current + 1) % activities.length;
    renderItems();
  }, 4000);
}

/* ----------------------------------------------------------------
   5. NAVBAR SCROLL EFFECT
   Adds .scrolled class to .navbar when user scrolls past 20px.
   ---------------------------------------------------------------- */
function initNavScroll() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  function onScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // run immediately
}

/* ----------------------------------------------------------------
   6. ACTIVE NAV SECTION HIGHLIGHT
   Highlights the nav link that corresponds to the section
   currently in view on the landing page.
   ---------------------------------------------------------------- */
function initNavHighlight() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a[href^='#']");
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(a => {
            a.classList.toggle("active", a.getAttribute("href") === "#" + id);
          });
        }
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach(s => observer.observe(s));
}

/* ----------------------------------------------------------------
   7. WAIT-TIME VISUALIZATION
   Animates the steps in the "Smart Wait Time" section.
   ---------------------------------------------------------------- */
function initWaitVis() {
  const waitSteps = document.querySelectorAll(".wait-step");
  if (!waitSteps.length) return;

  let current = 0;
  const MAX = waitSteps.length;

  function step() {
    waitSteps.forEach((el, i) => {
      el.classList.toggle("done",    i < current);
      el.classList.toggle("current", i === current);
    });
    current = (current + 1) % MAX;
    if (current === 0) {
      // Reset all, pause before restarting
      waitSteps.forEach(el => { el.classList.remove("done", "current"); });
      setTimeout(step, 1500);
    } else {
      setTimeout(step, 1800);
    }
  }

  // Start when section scrolls into view
  const section = document.getElementById("waitSection");
  if (!section) { step(); return; }

  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) { observer.disconnect(); step(); } },
    { threshold: 0.3 }
  );
  observer.observe(section);
}

/* ----------------------------------------------------------------
   8. FAQ ACCORDION
   Opens/closes FAQ items with smooth height animation.
   Supports multiple-open mode.
   ---------------------------------------------------------------- */
function initFAQ() {
  const faqItems = document.querySelectorAll(".faq-item");
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector(".faq-q");
    if (!question) return;

    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      // Close all others (single-open mode)
      faqItems.forEach(other => {
        if (other !== item) other.classList.remove("open");
      });

      // Toggle this one
      item.classList.toggle("open", !isOpen);

      // Update ARIA
      question.setAttribute("aria-expanded", String(!isOpen));
    });

    // Keyboard support
    question.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        question.click();
      }
    });
  });
}

/* ----------------------------------------------------------------
   9. BENTO QUEUE VISUALIZATION
   Animates the small bar chart inside the real-time tracking bento card.
   ---------------------------------------------------------------- */
function initBentoVis() {
  const bars = document.querySelectorAll(".bar-mini");
  if (!bars.length) return;

  const heights = [60, 80, 45, 100, 70, 35, 90, 55, 75, 40, 85, 65];
  let tick = 0;

  bars.forEach((bar, i) => {
    bar.style.height = heights[i % heights.length] + "%";
  });

  setInterval(() => {
    tick++;
    bars.forEach((bar, i) => {
      const h = heights[(i + tick) % heights.length];
      bar.style.height = h + "%";
    });
  }, 2000);
}

/* ----------------------------------------------------------------
   10. CONTACT FORM DEMO SUBMISSION
   Shows a success message without actually submitting anything.
   ---------------------------------------------------------------- */
function initContactForm() {
  const form    = document.getElementById("contactForm");
  const success = document.getElementById("contactSuccess");
  if (!form || !success) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Sending…';
    }
    setTimeout(() => {
      form.style.display = "none";
      success.classList.add("visible");
    }, 900);
  });
}

/* ----------------------------------------------------------------
   Bootstrap: call everything on DOMContentLoaded
   ---------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initCountUp();
  initHeroMock();
  initLiveActivity();
  initNavScroll();
  initNavHighlight();
  initWaitVis();
  initFAQ();
  initBentoVis();
  initContactForm();

  // Wire theme toggle buttons
  if (typeof Theme !== "undefined") {
    Theme.wireDOMButtons();
  }
});
