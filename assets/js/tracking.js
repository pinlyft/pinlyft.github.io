/* Pinlyft tracking: attribution capture + consent-gated analytics.
   EDIT IDS HERE. Public IDs only; never put secret keys in this file.
   - ga4MeasurementId: Google Analytics 4 web stream ID, looks like "G-ABC123XYZ".
     Find it in Analytics > Admin > Data streams > your web stream. Leave "" to keep GA off.
   - clarityProjectId: Microsoft Clarity project ID.
   - metaPixelId: Meta Pixel (dataset) ID, digits only. Leave "" to keep the Pixel off. */
const TRACKING = Object.freeze({
  ga4MeasurementId: "G-SKXHN88BCW",
  clarityProjectId: "zj68pkfoz3",
  metaPixelId: ""
});

(() => {
  "use strict";
  const CONSENT_KEY = "pinlyft_analytics_consent"; // "granted" | "denied"
  const FIRST_KEY = "pinlyft_first_touch";
  const LAST_KEY = "pinlyft_last_touch";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  const store = {
    get(area, key) { try { return window[area].getItem(key); } catch (e) { return null; } },
    set(area, key, value) { try { window[area].setItem(key, value); } catch (e) { /* storage blocked: ignore */ } }
  };

  /* 1. Attribution: where did this visitor come from? First-party only, sent only with a form submission. */
  const params = new URLSearchParams(window.location.search);
  const touch = { landing_page: window.location.pathname + window.location.search, referrer: document.referrer || "direct", captured_at: new Date().toISOString() };
  UTM_KEYS.forEach(key => { const v = params.get(key); if (v) touch[key] = v.slice(0, 100); });
  if (params.get("fbclid")) touch.click_id = "fbclid";
  if (params.get("gclid")) touch.click_id = "gclid";
  const hasCampaign = UTM_KEYS.some(key => touch[key]) || touch.click_id;
  if (!store.get("localStorage", FIRST_KEY)) store.set("localStorage", FIRST_KEY, JSON.stringify(touch));
  if (hasCampaign || !store.get("sessionStorage", LAST_KEY)) store.set("sessionStorage", LAST_KEY, JSON.stringify(touch));

  const read = (area, key) => { try { return JSON.parse(store.get(area, key) || "null"); } catch (e) { return null; } };
  window.pinlyftAttribution = () => {
    const first = read("localStorage", FIRST_KEY) || touch;
    const last = read("sessionStorage", LAST_KEY) || touch;
    const out = {};
    UTM_KEYS.forEach(key => { out[key] = last[key] || first[key] || ""; });
    out.first_landing_page = first.landing_page || "";
    out.first_referrer = first.referrer || "";
    out.last_landing_page = last.landing_page || "";
    out.last_referrer = last.referrer || "";
    out.click_id_type = last.click_id || first.click_id || "";
    return out;
  };

  /* 2. Analytics loaders: run only after the visitor accepts. */
  let loaded = false;
  const addScript = (src) => { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); };
  function loadAnalytics() {
    if (loaded) return; loaded = true;
    if (/^G-[A-Z0-9]+$/.test(TRACKING.ga4MeasurementId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", TRACKING.ga4MeasurementId);
      addScript("https://www.googletagmanager.com/gtag/js?id=" + TRACKING.ga4MeasurementId);
    }
    if (/^[a-z0-9]{6,}$/.test(TRACKING.clarityProjectId)) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", TRACKING.clarityProjectId);
      window.clarity("consent");
    }
    if (/^\d{10,20}$/.test(TRACKING.metaPixelId)) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", TRACKING.metaPixelId);
      window.fbq("track", "PageView");
    }
  }

  /* 3. Events. Safe to call any time; does nothing without consent. No personal fields are sent. */
  window.pinlyftTrack = (name, props = {}) => {
    if (!loaded) return;
    const a = window.pinlyftAttribution();
    const payload = Object.assign({ source: a.utm_source || a.last_referrer, campaign: a.utm_campaign }, props);
    if (typeof window.gtag === "function") window.gtag("event", name, payload);
    if (typeof window.clarity === "function") window.clarity("event", name);
    if (typeof window.fbq === "function") {
      if (name === "generate_lead") window.fbq("track", "Lead");
      if (name === "whatsapp_click") window.fbq("track", "Contact");
    }
  };

  /* 4. Consent bar: one choice, remembered in this browser. */
  function showBar() {
    const bar = document.createElement("div");
    bar.className = "consent-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Analytics choice");
    bar.innerHTML = '<p>We use analytics (Google Analytics and Microsoft Clarity) to see which pages help business owners and to fix what doesn\'t. No ads tracking without your OK. <a href="/privacy.html#cookies">Privacy Policy</a></p><div class="consent-actions"><button type="button" class="button secondary" data-consent="denied">No thanks</button><button type="button" class="button" data-consent="granted">Accept analytics</button></div>';
    bar.addEventListener("click", (event) => {
      const choice = event.target.getAttribute && event.target.getAttribute("data-consent");
      if (!choice) return;
      store.set("localStorage", CONSENT_KEY, choice);
      bar.remove();
      if (choice === "granted") loadAnalytics();
    });
    document.body.appendChild(bar);
  }
  window.pinlyftResetConsent = () => { try { localStorage.removeItem(CONSENT_KEY); } catch (e) {} window.location.reload(); };

  const start = () => {
    const consent = store.get("localStorage", CONSENT_KEY);
    if (consent === "granted") loadAnalytics();
    else if (consent !== "denied") showBar();
    document.querySelectorAll("[data-whatsapp]").forEach(link => link.addEventListener("click", () => window.pinlyftTrack("whatsapp_click", { link_location: link.className || "inline" })));
    document.querySelectorAll('a[href="#apply"]').forEach(link => link.addEventListener("click", () => window.pinlyftTrack("apply_click")));
    const form = document.querySelector("#application-form");
    if (form) form.addEventListener("focusin", () => window.pinlyftTrack("form_start"), { once: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
