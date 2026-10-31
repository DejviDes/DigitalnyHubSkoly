(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hlavička: pozadie po odscrollovaní, mobilné menu
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("nav");

  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setNav = (open) => {
    document.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  };
  if (toggle && nav) {
    toggle.addEventListener("click", () => setNav(!document.body.classList.contains("nav-open")));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNav(false);
    });
  }

  // Záložky modulov (ARIA tabs, šípky na klávesnici)
  const tablist = document.querySelector("[data-tabs]");
  if (tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  }

  // Microsoft 365: pavúk aplikácií, detail vybranej aplikácie sa sám strieda,
  // kým návštevník neklikne
  const eco = document.querySelector("[data-eco]");
  if (eco) {
    const ecoTabs = Array.from(eco.querySelectorAll('[role="tab"]'));
    const ecoLines = eco.querySelectorAll("[data-eco-line]");
    let ecoIdx = 0;
    let ecoTimer = null;
    let ecoStopped = reduceMotion;

    const ecoSelect = (i, focus) => {
      ecoIdx = (i + ecoTabs.length) % ecoTabs.length;
      const app = ecoTabs[ecoIdx].dataset.app;
      ecoTabs.forEach((t, j) => {
        const on = j === ecoIdx;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.classList.toggle("is-active", on);
      });
      ecoLines.forEach((l) => l.classList.toggle("is-active", l.dataset.ecoLine === app));
      if (focus) ecoTabs[ecoIdx].focus();
    };
    const ecoPause = () => {
      clearInterval(ecoTimer);
      ecoTimer = null;
    };
    const ecoPlay = () => {
      if (!ecoStopped && !ecoTimer) ecoTimer = setInterval(() => ecoSelect(ecoIdx + 1), 4500);
    };
    const ecoPick = (i, focus) => {
      ecoStopped = true;
      ecoPause();
      ecoSelect(i, focus);
    };

    ecoTabs.forEach((tab, i) => {
      tab.addEventListener("click", () => ecoPick(i, false));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = i + 1;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = i - 1;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = ecoTabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          ecoPick(next, true);
        }
      });
    });
    eco.addEventListener("mouseenter", ecoPause);
    eco.addEventListener("mouseleave", ecoPlay);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? ecoPlay() : ecoPause()), { threshold: 0.4 }).observe(eco);
    }
    ecoSelect(0);

    // Odkazy z hero (SharePoint, Teams…) otvoria rovno detail danej aplikácie
    document.querySelectorAll("[data-eco-link]").forEach((link) => {
      link.addEventListener("click", () => {
        const i = ecoTabs.findIndex((t) => t.dataset.app === link.dataset.ecoLink);
        if (i >= 0) ecoPick(i, false);
      });
    });
  }

  // Postupné zobrazovanie sekcií pri scrollovaní
  const reveals = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // Tok žiadosti: kroky sa rozsvecujú dookola, keď je sekcia na obrazovke
  const flow = document.querySelector("[data-flow]");
  if (flow && !reduceMotion && "IntersectionObserver" in window) {
    const steps = Array.from(flow.children);
    let timer = null;
    let idx = 0;
    const tick = () => {
      steps.forEach((s, i) => s.classList.toggle("is-lit", i <= idx));
      idx = (idx + 1) % (steps.length + 1);
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        tick();
        timer = setInterval(tick, 1100);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, { threshold: 0.3 }).observe(flow);
  } else if (flow) {
    Array.from(flow.children).forEach((s) => s.classList.add("is-lit"));
  }

  // Školy u zriaďovateľa sa postupne „pripájajú“ k hubu
  const schools = document.querySelector("[data-schools]");
  if (schools && !reduceMotion && "IntersectionObserver" in window) {
    const tiles = Array.from(schools.querySelectorAll("span"));
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      tiles.forEach((t, i) => setTimeout(() => t.classList.add("is-on"), 180 * i + 200));
    }, { threshold: 0.4 }).observe(schools);
  } else if (schools) {
    schools.querySelectorAll("span").forEach((t) => t.classList.add("is-on"));
  }

  // Počítadlá čísel
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const end = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const start = performance.now();
        const dur = 1100;
        const step = (now) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => io.observe(c));
  }

  // Rok v pätičke
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  // Odkazy, ktoré predvyplnia „Píšem za“ vo formulári
  document.querySelectorAll("[data-audience]").forEach((link) => {
    link.addEventListener("click", () => {
      const radio = document.querySelector(`input[name="audience"][value="${link.dataset.audience}"]`);
      if (radio) radio.checked = true;
    });
  });

  // Kontaktný formulár → /api/contact (Turnstile + Resend na serveri)
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const endpoint = form.dataset.contactEndpoint || "/api/contact";
  const statusEl = form.querySelector("[data-form-status]");
  const submit = form.querySelector('button[type="submit"]');
  const submitHtml = submit ? submit.innerHTML : "";
  const startField = form.querySelector("[data-form-start]");
  const COOLDOWN_KEY = "contact_form_last_submit";
  const COOLDOWN_MS = 30 * 60 * 1000;

  if (startField) startField.value = String(Date.now());

  const setStatus = (message, type) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error", "is-loading");
    if (type) statusEl.classList.add(type);
  };

  const resetTurnstile = () => {
    if (window.turnstile) {
      try { window.turnstile.reset(); } catch {}
    }
  };

  const cooldownLeft = () => {
    try {
      const last = Number(localStorage.getItem(COOLDOWN_KEY));
      if (!Number.isFinite(last) || !last) return 0;
      return Math.max(0, COOLDOWN_MS - (Date.now() - last));
    } catch {
      return 0;
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const left = cooldownLeft();
    if (left > 0) {
      setStatus(`Z tohto zariadenia ste už žiadosť odoslali. Skúste to prosím znova približne o ${Math.max(1, Math.ceil(left / 60000))} min.`, "is-error");
      return;
    }

    const data = new FormData(form);
    const contactName = String(data.get("contactName") || "").trim();
    const email = String(data.get("email") || "").trim();

    if (!contactName || !email) {
      setStatus("Vyplňte prosím meno a e-mail.", "is-error");
      (contactName ? form.querySelector("#f-email") : form.querySelector("#f-name")).focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("E-mailová adresa nevyzerá správne.", "is-error");
      form.querySelector("#f-email").focus();
      return;
    }

    const turnstileToken = String(data.get("cf-turnstile-response") || "").trim();
    if (!turnstileToken) {
      setStatus("Bezpečnostná kontrola ešte neprebehla. Počkajte chvíľu a skúste to znova.", "is-error");
      return;
    }

    const audience = String(data.get("audience") || "").trim();
    const note = String(data.get("challenge") || "").trim();
    const payload = {
      schoolName: String(data.get("schoolName") || "").trim(),
      contactName,
      email,
      challenge: [`Žiadosť o ukážku – píše za: ${audience || "neuvedené"}`, note].filter(Boolean).join("\n\n"),
      companyWebsite: String(data.get("companyWebsite") || "").trim(),
      formStartTs: Number(data.get("formStartTs") || 0),
      turnstileToken,
    };

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Odosielam…";
    }
    setStatus("Odosielam žiadosť…", "is-loading");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let err = null;
        try { err = await response.json(); } catch {}

        if (err && err.code === "CAPTCHA_FAILED") {
          setStatus("Bezpečnostná kontrola zlyhala. Skúste to prosím znova.", "is-error");
          resetTurnstile();
          return;
        }
        if (err && err.code === "DAILY_CAP_REACHED") {
          setStatus("Dnes už formulár prijal maximum žiadostí. Napíšte mi prosím priamo e-mailom.", "is-error");
          return;
        }
        if (response.status === 429 || (err && err.code === "RATE_LIMITED")) {
          const sec = Number((err && err.retryAfterSec) || 0);
          const wait = sec > 0 ? ` Skúste to prosím znova približne o ${Math.max(1, Math.ceil(sec / 60))} min.` : " Skúste to prosím neskôr.";
          setStatus(`Odoslanie je dočasne obmedzené kvôli ochrane pred spamom.${wait}`, "is-error");
          return;
        }
        throw new Error("Request failed");
      }

      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch {}
      form.reset();
      if (startField) startField.value = String(Date.now());
      resetTurnstile();
      setStatus("Ďakujem, žiadosť prišla. Ozvem sa vám e-mailom do 2 pracovných dní.", "is-success");
    } catch {
      setStatus("Odoslanie sa nepodarilo. Skúste to znova alebo mi napíšte priamo e-mailom.", "is-error");
      resetTurnstile();
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = submitHtml;
      }
    }
  });
})();
