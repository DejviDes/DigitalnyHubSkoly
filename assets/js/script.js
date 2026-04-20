const revealNodes = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

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

  revealNodes.forEach((node) => observer.observe(node));

  revealNodes.forEach((node, index) => {
    const stagger = Math.min(index * 0.035, 0.35);
    node.style.transitionDelay = `${stagger}s`;
  });
}

const currentPath = window.location.pathname.split("/").pop() || "index.html";
const navLinks = document.querySelectorAll(".main-nav a");
const brandLink = document.querySelector(".brand");

if (brandLink && !brandLink.querySelector(".brand-logo-full")) {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const inPagesDir = pathSegments[pathSegments.length - 2] === "pages";
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
  { prefix: "ukazky-demo", target: "vyhody-pre-vas.html" },
  { prefix: "ako-to-funguje", target: "riesenie.html" },
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
    };

    if (
      !payload.schoolName ||
      !payload.contactName ||
      !payload.email ||
      !payload.challenge
    ) {
      setStatus("Prosím vyplňte všetky povinné polia.", "is-error");
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

        throw new Error("Request failed");
      }

      contactForm.reset();
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

const tiltCards = document.querySelectorAll(
  ".lift-card, .module, .price-card, .home-app-shot",
);

if (tiltCards.length > 0 && window.matchMedia("(hover: hover)").matches) {
  if (prefersReducedMotion) {
    // Respect accessibility preference by skipping pointer-based tilt.
  } else {
    const maxTilt = 6;

    tiltCards.forEach((card) => {
      card.style.transformStyle = "preserve-3d";

      const resetCard = () => {
        card.style.transform = "";
      };

      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }

        const relativeX = (event.clientX - rect.left) / rect.width;
        const relativeY = (event.clientY - rect.top) / rect.height;

        const rotateY = (relativeX - 0.5) * maxTilt;
        const rotateX = (0.5 - relativeY) * maxTilt;

        card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      });

      card.addEventListener("pointerleave", resetCard);
      card.addEventListener("blur", resetCard, true);
    });
  }
}
