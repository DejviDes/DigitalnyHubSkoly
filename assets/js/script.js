const revealNodes = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const pathSegments = window.location.pathname.split("/").filter(Boolean);
const inPagesDir = pathSegments[pathSegments.length - 2] === "pages";
const resolvePageHref = (page) => (inPagesDir ? page : `pages/${page}`);
const resolveHomeHref = () => (inPagesDir ? "../index.html" : "index.html");

if (prefersReducedMotion) {
  revealNodes.forEach((node) => {
    node.classList.add("visible");
    node.style.transitionDelay = "0s";
  });
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    },
  );

  const skipReveal = (node) => {
    if (!node.matches(".section")) return false;
    if (node.matches(".section-compact")) return true;
    const prev = node.previousElementSibling;
    return !!(prev && prev.matches(".section.section-compact"));
  };

  revealNodes.forEach((node, index) => {
    if (skipReveal(node)) {
      node.classList.add("visible");
      node.style.transitionDelay = "0s";
      return;
    }
    observer.observe(node);
    const stagger = Math.min(index * 0.035, 0.35);
    node.style.transitionDelay = `${stagger}s`;
  });
}

const currentPath = window.location.pathname.split("/").pop() || "index.html";
const navLinks = document.querySelectorAll(".main-nav a");
const brandLink = document.querySelector(".brand");

if (brandLink && !brandLink.querySelector(".brand-logo-full")) {
  const assetPrefix = inPagesDir ? "../" : "";
  const fullLogo = document.createElement("img");
  fullLogo.className = "brand-logo-full";
  fullLogo.src = `${assetPrefix}assets/images/logoFull.png`;
  fullLogo.alt = "Digitálny hub školy";
  fullLogo.loading = "eager";
  fullLogo.decoding = "async";
  brandLink.prepend(fullLogo);
  brandLink.classList.add("has-logo-full");
}

const parentRouteMap = [
  { prefix: "modul-", target: "moduly.html" },
  { prefix: "vyhody-", target: "vyhody-pre-vas.html" },
  { prefix: "faq", target: "vyhody-pre-vas.html" },
  { prefix: "o-projekte", target: "vyhody-pre-vas.html" },
  { prefix: "porovnanie", target: "riesenie.html" },
];

let mappedPath = currentPath;
parentRouteMap.forEach((rule) => {
  if (currentPath.startsWith(rule.prefix)) {
    mappedPath = rule.target;
  }
});

navLinks.forEach((link) => {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return;
  }

  const cleanHref = href.split("#")[0];
  if (cleanHref === mappedPath) {
    link.classList.add("active");
  }
});

const footerWrap = document.querySelector(".site-footer .footer-wrap");

if (footerWrap && !footerWrap.classList.contains("footer-rich")) {
  const footerTitleRaw =
    footerWrap.querySelector("p")?.textContent?.trim() || "Digitálny hub školy";
  const footerTitle =
    footerTitleRaw.split("•")[0].trim() || "Digitálny hub školy";
  const allFooterAnchors = Array.from(footerWrap.querySelectorAll("a"));
  const existingMailLink = allFooterAnchors.find((link) =>
    link.getAttribute("href")?.startsWith("mailto:"),
  );

  const socialHostList = [
    "instagram.com",
    "linkedin.com",
    "x.com",
    "twitter.com",
    "youtube.com",
    "tiktok.com",
  ];

  const detectedSocialLinks = allFooterAnchors
    .map((link) => ({
      href: link.getAttribute("href") || "",
      text: (link.textContent || "").trim(),
    }))
    .filter(({ href }) =>
      socialHostList.some((host) => href.toLowerCase().includes(host)),
    );

  const socialFallbackLinks = [
    { href: "https://www.instagram.com/trebaticky.d/", text: "Instagram" },
    {
      href: "https://www.linkedin.com/in/trebatickydavid/",
      text: "LinkedIn",
    },
  ];

  const socialLinks =
    detectedSocialLinks.length > 0 ? detectedSocialLinks : socialFallbackLinks;

  const pageLinks = [
    { text: "Domov", href: resolveHomeHref() },
    { text: "Riešenie", href: resolvePageHref("riesenie.html") },
    { text: "Moduly", href: resolvePageHref("moduly.html") },
    { text: "Výhody pre vás", href: resolvePageHref("vyhody-pre-vas.html") },
    { text: "Cenník", href: resolvePageHref("cennik.html") },
    { text: "Kontakt", href: resolvePageHref("kontakt.html") },
  ];

  const resolveSocialType = (href = "") => {
    const lowerHref = href.toLowerCase();
    if (lowerHref.includes("instagram.com")) return "instagram";
    if (lowerHref.includes("linkedin.com")) return "linkedin";
    if (lowerHref.includes("x.com") || lowerHref.includes("twitter.com")) {
      return "x";
    }
    return "generic";
  };

  const socialIcon = (type) => {
    if (type === "instagram") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.8" r="1"></circle></svg>';
    }
    if (type === "linkedin") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3"></rect><circle cx="8" cy="9" r="1.5"></circle><path d="M6.9 11.2v6"></path><path d="M11 17.2v-6"></path><path d="M11 13.8c0-1.5 1.1-2.6 2.5-2.6s2.4 1 2.4 2.8v3.2"></path></svg>';
    }
    if (type === "x") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14"></path><path d="M19 5l-5.6 6.4"></path><path d="M10.5 15.6L5 19"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 8.2v7.2"></path><path d="M8.4 11.8h7.2"></path></svg>';
  };

  const socialHtml = `<div class="footer-social footer-social-icons" aria-label="Sociálne siete">${socialLinks
    .map(({ href, text }) => {
      const type = resolveSocialType(href);
      const label = text || "Profil";
      return `<a href="${href}" target="_blank" rel="noopener" aria-label="${label}">${socialIcon(type)}<span>${label}</span></a>`;
    })
    .join("")}</div>`;

  const contactEmail = existingMailLink
    ? (
        existingMailLink.getAttribute("href") ||
        "mailto:trebaticky.david@outlook.com"
      ).replace("mailto:", "")
    : "trebaticky.david@outlook.com";

  const contactHtml = `
    <ul class="footer-contact-list">
      <li><span>Meno:</span> David Trebatický</li>
      <li><span>E-mail:</span> <a href="mailto:${contactEmail}">${contactEmail}</a></li>
      <li><span>Telefón:</span> +421944021690</li>
    </ul>
  `;

  footerWrap.classList.add("footer-rich");
  footerWrap.innerHTML = `
    <div class="footer-grid">
      <section class="footer-col footer-col-brand" aria-label="Základné informácie">
        <h3>${footerTitle}</h3>
        <p>Jedno digitálne miesto pre procesy školy, ktoré znižuje administratívu a zlepšuje prehľad.</p>
        <a class="footer-mail" href="${resolvePageHref("kontakt.html")}">Prejsť na kontakt</a>
      </section>

      <section class="footer-col" aria-label="Hlavná navigácia">
        <h3>Stránky</h3>
        <ul class="footer-links">
          ${pageLinks
            .map(({ text, href }) => `<li><a href="${href}">${text}</a></li>`)
            .join("")}
        </ul>
      </section>

      <section class="footer-col" aria-label="Kontakt na prevádzkovateľa">
        <h3>Kontakt na mňa</h3>
        ${contactHtml}
        ${socialHtml}
      </section>
    </div>

    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} ${footerTitle}. Všetky práva vyhradené.</p>
    </div>
  `;
}

const mobileNavBreakpoint = 860;
const siteHeader = document.querySelector(".site-header");
const navWrap = document.querySelector(".nav-wrap");
const mainNav = document.querySelector(".main-nav");
const navCta = document.querySelector(".nav-wrap .btn-small");

if (siteHeader) {
  const syncHeaderScrolledState = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 14);
  };

  syncHeaderScrolledState();
  window.addEventListener("scroll", syncHeaderScrolledState, { passive: true });
}

if (siteHeader && navWrap && mainNav) {
  if (!mainNav.id) {
    mainNav.id = "site-main-nav";
  }

  const menuToggle = document.createElement("button");
  menuToggle.type = "button";
  menuToggle.className = "menu-toggle";
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-controls", mainNav.id);
  menuToggle.setAttribute("aria-label", "Otvoriť navigáciu");
  menuToggle.innerHTML = `<span></span><span></span><span></span>`;

  const brand = navWrap.querySelector(".brand");
  if (brand && brand.nextSibling) {
    navWrap.insertBefore(menuToggle, brand.nextSibling);
  } else {
    navWrap.appendChild(menuToggle);
  }

  const closeMobileMenu = () => {
    siteHeader.classList.remove("is-menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Otvoriť navigáciu");
  };

  const openMobileMenu = () => {
    siteHeader.classList.add("is-menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Zavrieť navigáciu");
  };

  const toggleMobileMenu = () => {
    if (siteHeader.classList.contains("is-menu-open")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  menuToggle.addEventListener("click", toggleMobileMenu);

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= mobileNavBreakpoint) {
        closeMobileMenu();
      }
    });
  });

  if (navCta) {
    navCta.addEventListener("click", () => {
      if (window.innerWidth <= mobileNavBreakpoint) {
        closeMobileMenu();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > mobileNavBreakpoint) {
      closeMobileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      siteHeader.classList.contains("is-menu-open")
    ) {
      closeMobileMenu();
    }
  });
}

const pricingCards = document.querySelectorAll(".price-selectable[data-plan]");
const pricingDetails = document.querySelectorAll("[data-plan-detail]");

if (pricingCards.length > 0 && pricingDetails.length > 0) {
  const selectPlan = (planId) => {
    pricingCards.forEach((card) => {
      const isActive = card.dataset.plan === planId;
      card.classList.toggle("is-selected", isActive);
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    pricingDetails.forEach((detail) => {
      detail.hidden = detail.dataset.planDetail !== planId;
    });
  };

  pricingCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectPlan(card.dataset.plan);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPlan(card.dataset.plan);
      }
    });
  });

  const planFromUrl = new URLSearchParams(window.location.search).get("plan");
  if (planFromUrl) {
    const planExists = Array.from(pricingCards).some(
      (card) => card.dataset.plan === planFromUrl,
    );
    if (planExists) {
      selectPlan(planFromUrl);
    }
  }
}

const pricingRedirectCards = document.querySelectorAll("[data-plan-link]");

if (pricingRedirectCards.length > 0) {
  const selectRedirectCard = (activeCard) => {
    pricingRedirectCards.forEach((card) => {
      const isActive = card === activeCard;
      card.classList.toggle("is-selected", isActive);
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  pricingRedirectCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const interactiveTarget = event.target.closest(
        "a, button, input, textarea",
      );
      if (interactiveTarget) {
        return;
      }
      selectRedirectCard(card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRedirectCard(card);
      }
    });
  });
}

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const endpoint = contactForm.dataset.contactEndpoint || "/api/contact";
  const statusEl = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton ? submitButton.textContent : "";
  const formStartInput = contactForm.querySelector("[data-form-start]");
  const formMountedAt = Date.now();

  if (formStartInput && !formStartInput.value) {
    formStartInput.value = String(formMountedAt);
  }

  const setStatus = (message, type) => {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error", "is-loading");
    if (type) {
      statusEl.classList.add(type);
    }
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      schoolName: String(formData.get("schoolName") || "").trim(),
      contactName: String(formData.get("contactName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      challenge: String(formData.get("challenge") || "").trim(),
      companyWebsite: String(formData.get("companyWebsite") || "").trim(),
      formStartTs: Number(formData.get("formStartTs") || formMountedAt),
      turnstileToken: String(
        formData.get("cf-turnstile-response") ||
          formData.get("turnstileToken") ||
          "",
      ).trim(),
    };

    if (!payload.contactName || !payload.email) {
      setStatus("Prosím vyplňte kontaktnú osobu a e-mail.", "is-error");
      return;
    }

    const hasTurnstileWidget = Boolean(
      contactForm.querySelector(".cf-turnstile"),
    );
    if (hasTurnstileWidget && !payload.turnstileToken) {
      setStatus("Potvrďte prosím, že nie ste robot.", "is-error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Odosielam...";
    }
    setStatus("Odosielam žiadosť...", "is-loading");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorPayload = null;
        try {
          errorPayload = await response.json();
        } catch {
          errorPayload = null;
        }

        if (response.status === 429 || errorPayload?.code === "RATE_LIMITED") {
          const retryAfterSec = Number(errorPayload?.retryAfterSec || 0);
          const retryAfterMin =
            retryAfterSec > 0
              ? Math.max(1, Math.ceil(retryAfterSec / 60))
              : null;
          const retryMessage = retryAfterMin
            ? ` Skúste to prosím znova približne o ${retryAfterMin} min.`
            : " Skúste to prosím znova neskôr.";

          setStatus(
            `Za posledných 30 minút už boli odoslané 2 žiadosti. Aby sme predišli spamu, ďalšie odoslanie je dočasne obmedzené.${retryMessage}`,
            "is-error",
          );
          return;
        }

        if (
          response.status === 403 ||
          errorPayload?.code === "CAPTCHA_FAILED"
        ) {
          setStatus(
            "Overenie captcha zlyhalo. Potvrďte prosím, že nie ste robot, a skúste to znova.",
            "is-error",
          );
          return;
        }

        throw new Error("Request failed");
      }

      contactForm.reset();
      if (window.turnstile?.reset) {
        const widget = contactForm.querySelector(".cf-turnstile");
        if (widget) {
          window.turnstile.reset(widget);
        }
      }
      if (formStartInput) {
        formStartInput.value = String(Date.now());
      }
      setStatus("Žiadosť bola odoslaná. Ozveme sa vám e-mailom.", "is-success");
    } catch (error) {
      setStatus(
        "Odoslanie sa nepodarilo. Skúste to znova alebo nás kontaktujte e-mailom.",
        "is-error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}

const lightboxTriggers = document.querySelectorAll("[data-lightbox-src]");

if (lightboxTriggers.length > 0) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Náhľad obrázka");

  overlay.innerHTML = `
    <figure class="lightbox-panel">
      <div class="lightbox-toolbar">
        <button type="button" class="lightbox-zoom-btn" data-zoom-action="out" aria-label="Oddialiť obrázok">−</button>
        <span class="lightbox-zoom-value" aria-live="polite">100%</span>
        <button type="button" class="lightbox-zoom-btn" data-zoom-action="in" aria-label="Priblížiť obrázok">+</button>
        <button type="button" class="lightbox-zoom-btn" data-zoom-action="reset" aria-label="Resetovať priblíženie">100%</button>
      </div>
      <button type="button" class="lightbox-close" aria-label="Zavrieť galériu">×</button>
      <div class="lightbox-stage">
        <img class="lightbox-image" alt="" />
      </div>
    </figure>
  `;

  document.body.appendChild(overlay);

  const lightboxImage = overlay.querySelector(".lightbox-image");
  const lightboxStage = overlay.querySelector(".lightbox-stage");
  const closeButton = overlay.querySelector(".lightbox-close");
  const zoomValue = overlay.querySelector(".lightbox-zoom-value");
  const zoomButtons = overlay.querySelectorAll("[data-zoom-action]");

  let zoomLevel = 1;
  const minZoom = 1;
  const maxZoom = 4;
  const zoomStep = 0.2;
  const wheelZoomSensitivity = 0.01;
  const maxWheelZoomStep = 0.05;
  let lastFocusXRatio = 0.5;
  let lastFocusYRatio = 0.5;
  let lastPointerClientX = null;
  let lastPointerClientY = null;

  const clampRatio = (value) => Math.min(1, Math.max(0, value));

  const getFocusFromClientPoint = (clientX, clientY) => {
    const rect = lightboxStage.getBoundingClientRect();
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    const isValid =
      Number.isFinite(rawX) &&
      Number.isFinite(rawY) &&
      rawX >= 0 &&
      rawX <= 1 &&
      rawY >= 0 &&
      rawY <= 1;

    if (!isValid) {
      return null;
    }

    return { x: clampRatio(rawX), y: clampRatio(rawY) };
  };

  const getFocusFromEvent = (event) => {
    const fromEvent = getFocusFromClientPoint(event.clientX, event.clientY);
    if (fromEvent) {
      lastFocusXRatio = fromEvent.x;
      lastFocusYRatio = fromEvent.y;
      return fromEvent;
    }

    const fromLastPointer = getFocusFromClientPoint(
      lastPointerClientX,
      lastPointerClientY,
    );
    if (fromLastPointer) {
      lastFocusXRatio = fromLastPointer.x;
      lastFocusYRatio = fromLastPointer.y;
      return fromLastPointer;
    }

    return { x: lastFocusXRatio, y: lastFocusYRatio };
  };

  const updateZoom = (nextZoom, focusXRatio = 0.5, focusYRatio = 0.5) => {
    const previousZoom = zoomLevel;
    zoomLevel = Math.min(maxZoom, Math.max(minZoom, nextZoom));

    if (zoomLevel === previousZoom) {
      zoomValue.textContent = `${Math.round(zoomLevel * 100)}%`;
      return;
    }

    const safeFocusX = clampRatio(focusXRatio);
    const safeFocusY = clampRatio(focusYRatio);
    const focalX =
      lightboxStage.scrollLeft + lightboxStage.clientWidth * safeFocusX;
    const focalY =
      lightboxStage.scrollTop + lightboxStage.clientHeight * safeFocusY;

    lightboxImage.style.width = `${Math.round(zoomLevel * 100)}%`;
    zoomValue.textContent = `${Math.round(zoomLevel * 100)}%`;

    const zoomRatio = zoomLevel / previousZoom;

    requestAnimationFrame(() => {
      lightboxStage.scrollLeft =
        focalX * zoomRatio - lightboxStage.clientWidth * safeFocusX;
      lightboxStage.scrollTop =
        focalY * zoomRatio - lightboxStage.clientHeight * safeFocusY;
    });
  };

  const closeLightbox = () => {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    updateZoom(1);
    lightboxStage.scrollTop = 0;
    lightboxStage.scrollLeft = 0;
  };

  const openLightbox = (src, alt) => {
    lightboxImage.src = src;
    lightboxImage.alt = alt || "Náhľad obrázka";
    updateZoom(1);
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  lightboxTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      lastPointerClientX = event.clientX;
      lastPointerClientY = event.clientY;
      openLightbox(trigger.dataset.lightboxSrc, trigger.dataset.lightboxAlt);
    });
  });

  closeButton.addEventListener("click", closeLightbox);

  zoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.zoomAction;
      if (action === "in") {
        updateZoom(zoomLevel + zoomStep);
      } else if (action === "out") {
        updateZoom(zoomLevel - zoomStep);
      } else {
        updateZoom(1);
      }
    });
  });

  lightboxStage.addEventListener(
    "wheel",
    (event) => {
      if (!overlay.classList.contains("is-open")) {
        return;
      }

      const wantsZoom = event.ctrlKey || event.metaKey;
      if (!wantsZoom) {
        // Let native stage scrolling handle panning on trackpad.
        return;
      }

      event.preventDefault();
      const rawDelta = -event.deltaY * wheelZoomSensitivity;
      const delta = Math.max(
        -maxWheelZoomStep,
        Math.min(maxWheelZoomStep, rawDelta),
      );
      const focus = getFocusFromEvent(event);
      updateZoom(zoomLevel + delta, focus.x, focus.y);
    },
    { passive: false },
  );

  lightboxStage.addEventListener("pointermove", (event) => {
    lastPointerClientX = event.clientX;
    lastPointerClientY = event.clientY;
    const focus = getFocusFromEvent(event);
    lastFocusXRatio = focus.x;
    lastFocusYRatio = focus.y;
  });

  overlay.addEventListener("pointermove", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }
    lastPointerClientX = event.clientX;
    lastPointerClientY = event.clientY;
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateZoom(zoomLevel + zoomStep);
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      updateZoom(zoomLevel - zoomStep);
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      updateZoom(1);
    }
  });
}
