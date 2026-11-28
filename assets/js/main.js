/* EDIT CONTACT DETAILS HERE ONCE. Public settings only; never add secret keys. */
const CONFIG = Object.freeze({
  whatsappNumber: "917982591987", // Country code + number, e.g. 919876543210; digits only.
  email: "pinlyft.agency@gmail.com",
  formspreeEndpoint: "https://formspree.io/f/xnpdoraq", // https://formspree.io/f/your_form_id
  founderPhoto: "/assets/img/founder-placeholder.svg" // Change to /assets/img/siddharth.jpg when added.
});

(() => {
  "use strict";
  const IS_CA = document.documentElement.dataset.country === "CA";
  const NICHE = document.documentElement.dataset.niche || "clinic";
  const BUSINESS = {clinic:"a clinic", solar:"a rooftop solar company", hvac:"an HVAC company"}[NICHE] || "a business";
  const message = "Hi Siddharth, I own " + BUSINESS + " in ___ and want to know about the 14-day Enquiry Sprint.";
  const waNumber = CONFIG.whatsappNumber.replace(/\D/g, "");
  const waReady = /^91[6-9]\d{9}$/.test(waNumber);
  const emailReady = /^[^\s@{}]+@[^\s@{}]+\.[^\s@{}]+$/.test(CONFIG.email);
  const waURL = (clinic = "") => "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message + (clinic ? " My business is " + clinic + "." : ""));
  const contactHelp = document.querySelector("#contact-help");
  document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll("[data-whatsapp]").forEach(link => {
    if (waReady) {
      link.href = waURL(); link.target = "_blank"; link.rel = "noopener noreferrer";
    } else {
      link.addEventListener("click", event => {
        event.preventDefault();
        contactHelp.hidden = false;
        contactHelp.textContent = "WhatsApp contact is not available yet. Please contact Pinlyft on Instagram: ";
        const instagram = document.createElement("a");
        instagram.href = "https://www.instagram.com/pinlyft"; instagram.textContent = "@pinlyft";
        contactHelp.append(instagram); contactHelp.scrollIntoView({block: "center"});
      });
    }
  });
  document.querySelectorAll("[data-email]").forEach(el => {
    if (emailReady) { el.textContent = CONFIG.email; el.href = "mailto:" + CONFIG.email; }
    else { el.textContent = "Contact Pinlyft on Instagram (email contact pending)"; el.href = "https://www.instagram.com/pinlyft"; }
  });
  const portrait = document.querySelector("[data-founder-photo]");
  if (portrait && CONFIG.founderPhoto !== "/assets/img/founder-placeholder.svg") {
    portrait.addEventListener("error", () => { portrait.src = "/assets/img/founder-placeholder.svg"; portrait.alt = "S monogram placeholder for Siddharth's portrait"; }, {once:true});
    portrait.src = CONFIG.founderPhoto; portrait.alt = "Siddharth, founder of Pinlyft";
  }
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), {threshold:0.06});
    document.querySelectorAll(".reveal").forEach(el => { el.classList.add("ready"); observer.observe(el); });
  }
  const form = document.querySelector("#application-form");
  if (!form) return;
  const submit = document.querySelector("#submit-application");
  const phone = document.querySelector("#phone");
  const feedback = document.querySelector("#form-feedback");
  const feedbackMessage = document.querySelector("#form-message");
  const fallback = document.querySelector("#form-whatsapp");
  const patientNotice = document.querySelector("#patient-message");
  let busy = false, sent = false;
  const isPatient = () => ["Patient", "Homeowner"].includes(form.elements.role.value);
  const updateRole = () => {
    patientNotice.hidden = !isPatient();
    submit.disabled = busy || sent || isPatient();
  };
  form.querySelectorAll('[name="role"]').forEach(radio => radio.addEventListener("change", updateRole));
  updateRole();
  const normalizePhone = value => {
    const cleaned = value.trim().replace(/[\s()-]/g, "");
    if (IS_CA) {
      const digits = cleaned.replace(/^\+?1(?=\d{10}$)/, "");
      return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? "+1" + digits : null;
    }
    return /^(?:\+91)?[6-9]\d{9}$/.test(cleaned) ? "+91" + cleaned.replace(/^\+91/, "") : null;
  };
  phone.addEventListener("input", () => phone.setCustomValidity(""));
  const showFeedback = text => {
    feedbackMessage.textContent = text;
    feedback.hidden = false;
    if (waReady && !IS_CA) fallback.href = waURL(form.elements.clinic_name.value.trim());
    feedback.focus();
  };
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || sent || isPatient()) { updateRole(); return; }
    if (form.elements._gotcha.value) { showFeedback("We couldn't send this application. Please try again or contact us directly."); return; }
    for (const name of ["name", "clinic_name"]) form.elements[name].value = form.elements[name].value.trim();
    const normalizedPhone = normalizePhone(phone.value);
    phone.setCustomValidity(normalizedPhone ? "" : (IS_CA ? "Enter a valid 10-digit Canadian phone number, optionally with +1." : "Enter a valid 10-digit Indian mobile number starting with 6–9, optionally with +91."));
    if (!form.reportValidity()) return;
    if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(CONFIG.formspreeEndpoint)) {
      showFeedback("Online applications are not connected yet. Please WhatsApp us instead, or contact @pinlyft on Instagram."); return;
    }
    busy = true; updateRole(); submit.textContent = "Sending…"; form.setAttribute("aria-busy", "true");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const data = new FormData(form);
    data.set("phone", normalizedPhone);
    data.set("_subject", "Pinlyft " + (IS_CA ? "CANADA " : "") + (NICHE === "clinic" ? "" : NICHE.toUpperCase() + " ") + "— 14-Day Enquiry Sprint application");
    data.set("niche", NICHE);
    data.set("market", IS_CA ? "Canada" : "India");
    data.set("privacy_policy_version", "2026-11-25");
    if (typeof window.pinlyftAttribution === "function") {
      const attribution = window.pinlyftAttribution();
      Object.keys(attribution).forEach(key => data.set(key, attribution[key]));
    }
    try {
      const response = await fetch(CONFIG.formspreeEndpoint, {method:"POST", body:data, headers:{Accept:"application/json"}, signal:controller.signal});
      if (!response.ok) throw new Error("Submission failed");
      sent = true;
      showFeedback(IS_CA ? "Thanks! Siddharth will call or text you within one business day (Mon–Fri, 9am–1pm ET)." : "Thanks! We'll WhatsApp you within working hours (Mon–Sat, 10am–7pm).");
      submit.textContent = "Application sent";
      form.querySelectorAll("input, select").forEach(field => { field.disabled = true; });
      if (typeof window.pinlyftTrack === "function") window.pinlyftTrack("generate_lead", { clinic_type: form.elements.clinic_type.value, city: form.elements.city.value, heard_from: form.elements.heard_from.value });
    } catch (error) {
      showFeedback(error.name === "AbortError" ? "We couldn't confirm delivery in time. Please WhatsApp us to check before submitting again." : "We couldn't send your application. Please try again, or WhatsApp us now.");
      submit.textContent = "Try sending again";
    } finally {
      clearTimeout(timeout); busy = false; form.removeAttribute("aria-busy"); updateRole();
    }
  });
  // Hide the mobile shortcut whenever the application section is on screen.
  // The inline fallback remains available; the floating button cannot cover Submit.
  const floating = document.querySelector(".floating-wa");
  if (floating && "IntersectionObserver" in window) {
    new IntersectionObserver(entries => { floating.hidden = entries[0].isIntersecting; }).observe(document.querySelector("#apply"));
  } else if (floating) { floating.hidden = true; }
})();

/* Analytics, Meta Pixel and consent live in /assets/js/tracking.js. */

// Native-scroll choreography. No wheel interception or synthetic scroll positions.
(() => {
  const section = document.querySelector('.scroll-story');
  if (!section) return;
  const visual = section.querySelector('.story-visual');
  const chapters = [...section.querySelectorAll('[data-chapter]')];
  const counter = section.querySelector('.scene-counter');
  const hero = document.querySelector('.hero-copy');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 701px)');
  let scheduled = false;
  let active = -1;
  function paint() {
    scheduled = false;
    const animated = !motion.matches && desktop.matches;
    let next = 0;
    if (animated) {
      const centre = window.innerHeight * 0.55;
      let closest = Infinity;
      chapters.forEach((chapter, index) => {
        const box = chapter.getBoundingClientRect();
        const distance = Math.abs(box.top + box.height * 0.5 - centre);
        if (distance < closest) { closest = distance; next = index; }
      });
    }
    if (next !== active) {
      active = next;
      visual.dataset.scene = String(next);
      counter.textContent = String(next + 1).padStart(2, '0') + ' / 04';
    }
    if (hero) {
      const progress = animated ? Math.min(window.scrollY / 650, 1) : 0;
      hero.style.transform = 'translateY(' + (progress * -18) + 'px)';
      hero.style.opacity = String(1 - progress * 0.12);
    }
  }
  function requestPaint() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(paint); }
  }
  window.addEventListener('scroll', requestPaint, {passive:true});
  window.addEventListener('resize', requestPaint, {passive:true});
  motion.addEventListener('change', requestPaint);
  desktop.addEventListener('change', requestPaint);
  paint();
})();
