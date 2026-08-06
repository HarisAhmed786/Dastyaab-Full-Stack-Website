/**
 * Dark mode. Applies the saved theme immediately (before paint, since
 * this script tag sits early in <head> on every page) to avoid a flash
 * of the wrong theme, then injects a toggle button once the DOM is ready.
 */
(function () {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);

  function injectToggle() {
    if (document.getElementById("theme-toggle-btn")) return;

    let wrap = document.getElementById("dastyaab-widgets");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "dastyaab-widgets";
      document.body.appendChild(wrap);
    }

    const btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.className = "dw-btn";
    btn.title = "Toggle dark mode";
    btn.setAttribute("aria-label", "Toggle dark mode");
    btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      btn.textContent = next === "dark" ? "☀️" : "🌙";
    });

    // Theme toggle goes first (leftmost of the floating widgets);
    // the notification bell (if socket.js is loaded) inserts itself after.
    wrap.insertBefore(btn, wrap.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToggle);
  } else {
    injectToggle();
  }
})();
