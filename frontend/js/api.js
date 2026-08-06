/**
 * Shared API helper — every page should call these instead of raw fetch().
 * Requires js/config.js to be loaded first.
 *
 * Phase 1: centralizes the base URL, JSON headers, and error handling.
 * Phase 2 will extend this to attach the JWT Authorization header and
 * handle 401s globally — that logic slots into `apiFetch` below without
 * requiring every page to change how it calls the helper.
 */
(function () {
  const { API_URL } = window.DASTYAAB_CONFIG;

  /**
   * @param {string} path - e.g. "/login", "/providers/123"
   * @param {RequestInit} [options]
   * @returns {Promise<any>} parsed JSON response
   * @throws {Error} with a readable message on non-2xx or network failure
   */
  async function apiFetch(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Phase 2 hook: attach the stored JWT automatically once auth is live.
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch (err) {
      throw new Error("Cannot connect to server. Is it running?");
    }

    // Phase 2 hook: on 401, clear session and redirect to login.
    if (res.status === 401) {
      localStorage.clear();
      if (window.showToast) window.showToast("Your session expired. Please log in again.", "error");
      setTimeout(() => { window.location.href = "login.html"; }, 800);
      return;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      // Some endpoints (rare) may not return JSON; ignore parse errors.
    }

    if (!res.ok) {
      const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data;
  }

  window.api = {
    get: (path) => apiFetch(path),
    post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
    put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
    del: (path) => apiFetch(path, { method: "DELETE" }),
  };

  /**
   * Escapes HTML special characters in user-generated text (review
   * comments, chat messages, names, etc.) before it's inserted via
   * innerHTML. Use this on any dynamic string coming from the server
   * that originated from another user's input, to prevent stored XSS.
   *
   * Usage: `<div>${escapeHtml(review.comment)}</div>`
   */
  window.escapeHtml = function (str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /**
   * Toast notifications — replaces alert() everywhere.
   * Usage: showToast("Booking sent!", "success")
   * types: "success" | "error" | "info" (default)
   */
  window.showToast = function (message, type = "info", duration = 3500) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const icons = { success: "✓", error: "⚠️", info: "ℹ️" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-body">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    const remove = () => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 200);
    };
    toast.querySelector(".toast-close").addEventListener("click", remove);
    setTimeout(remove, duration);

    container.appendChild(toast);
  };

  /**
   * Renders `count` skeleton placeholder cards into a container while
   * data is loading. Usage: container.innerHTML = skeletonCards(3)
   */
  window.skeletonCards = function (count = 3) {
    return Array.from({ length: count }, () => `
      <div class="skel-card">
        <div class="skel-row">
          <div class="skel skel-avatar"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
            <div class="skel skel-line w-40"></div>
            <div class="skel skel-line w-60"></div>
          </div>
        </div>
        <div class="skel skel-line w-100"></div>
        <div class="skel skel-line w-80"></div>
      </div>
    `).join("");
  };

  /**
   * Renders a friendly empty state block.
   * Usage: container.innerHTML = emptyState({icon:"📭", title:"No bookings yet", sub:"...", ctaText:"Browse providers", ctaHref:"search.html"})
   */
  window.emptyState = function ({ icon = "📭", title = "Nothing here yet", sub = "", ctaText, ctaHref }) {
    return `
      <div class="empty-state-block fade-in">
        <div class="icon">${icon}</div>
        <div class="title">${escapeHtml(title)}</div>
        ${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ""}
        ${ctaText && ctaHref ? `<a class="cta" href="${ctaHref}">${escapeHtml(ctaText)}</a>` : ""}
      </div>
    `;
  };

  /**
   * Renders a visual booking-status stepper: Pending → Accepted → Completed.
   * Rejected bookings get their own short-circuit path.
   * Usage: `<div class="status-stepper">${statusStepper(booking.status)}</div>`
   */
  window.statusStepper = function (status) {
    if (status === "Rejected") {
      return `
        <div class="step done rejected"><div class="line"></div><div class="dot">1</div><div class="label">Requested</div></div>
        <div class="step active rejected"><div class="line"></div><div class="dot">✗</div><div class="label">Rejected</div></div>
      `;
    }
    const steps = ["Pending", "Accepted", "Completed"];
    const labels = { Pending: "Requested", Accepted: "Accepted", Completed: "Completed" };
    const currentIdx = steps.indexOf(status);
    return steps.map((s, i) => {
      const cls = i < currentIdx ? "done" : i === currentIdx ? "active" : "";
      const dotContent = i < currentIdx ? "✓" : i + 1;
      return `<div class="step ${cls}"><div class="line"></div><div class="dot">${dotContent}</div><div class="label">${labels[s]}</div></div>`;
    }).join("");
  };

  /**
   * Renders a small dependency-free SVG bar chart. No charting library
   * needed — keeps every page lightweight and self-contained.
   *
   * @param {Array<{label:string, value:number}>} data
   * @param {{color?:string, prefix?:string, height?:number}} [opts]
   * @returns {string} SVG markup
   */
  window.miniBarChart = function (data, opts = {}) {
    const { color = "#c84b2f", prefix = "", height = 140 } = opts;
    const max = Math.max(...data.map(d => d.value), 1);
    const barWidth = 100 / data.length;

    const bars = data.map((d, i) => {
      const barHeight = Math.max((d.value / max) * (height - 30), 2);
      const x = i * barWidth + barWidth * 0.18;
      const w = barWidth * 0.64;
      const y = height - 20 - barHeight;
      return `
        <rect x="${x}%" y="${y}" width="${w}%" height="${barHeight}" rx="3" fill="${color}" opacity="0.9">
          <title>${escapeHtml(d.label)}: ${prefix}${d.value}</title>
        </rect>
        <text x="${x + w / 2}%" y="${height - 6}" font-size="10" fill="var(--muted)" text-anchor="middle">${escapeHtml(d.label)}</text>
        <text x="${x + w / 2}%" y="${y - 4}" font-size="10" fill="var(--ink)" text-anchor="middle" font-weight="600">${d.value > 0 ? prefix + d.value : ""}</text>
      `;
    }).join("");

    return `<svg viewBox="0 0 300 ${height}" style="width:100%; height:${height}px;" preserveAspectRatio="none" role="img" aria-label="Bar chart">${bars}</svg>`;
  };
})();
