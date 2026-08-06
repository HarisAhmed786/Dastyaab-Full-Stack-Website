// GLOBAL SOCKET & NOTIFICATION SYSTEM

const uId    = localStorage.getItem("userId");
const uName  = localStorage.getItem("userName");
const uRole  = localStorage.getItem("userRole");
const uToken = localStorage.getItem("token");

let activeBookingId = null;
let notifications = [];   // { icon, title, body, time, href }
let unreadCount = 0;

// Only connect if actually logged in — the backend now requires a valid
// JWT on the socket handshake, so an anonymous connection would just be
// rejected anyway.
let socket = null;
if (uToken) {
  socket = io(window.DASTYAAB_CONFIG.SOCKET_URL, { auth: { token: uToken } });

  socket.on("connect_error", (err) => {
    console.warn("Socket auth failed:", err.message);
  });

  // 1. Listen for new chat messages
  socket.on("notification:new_message", (data) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname.includes("messages.html") && urlParams.get("bookingId") === data.bookingId) {
      return;
    }
    pushNotification({
      icon: "💬",
      title: data.senderName,
      body: data.preview,
      href: `messages.html?bookingId=${data.bookingId}`,
    });
    showChatPopup(data);
  });

  // 2. New booking request (providers)
  socket.on("notification:new_booking", (data) => {
    pushNotification({
      icon: data.isEmergency ? "🚨" : "📩",
      title: "New booking request",
      body: `${data.customerName} needs help with ${data.serviceType || "a service"}`,
      href: "dashboard.html",
    });
  });

  // 3. Booking status changed (customers)
  socket.on("notification:booking_status", (data) => {
    pushNotification({
      icon: data.status === "Accepted" ? "✅" : data.status === "Rejected" ? "❌" : "🎉",
      title: `Booking ${data.status}`,
      body: `${data.providerName || "Your provider"} ${data.status.toLowerCase()} your request`,
      href: "history.html",
    });
  });
}

function pushNotification(n) {
  notifications.unshift({ ...n, time: new Date() });
  notifications = notifications.slice(0, 20);
  unreadCount++;
  updateBellUI();
  if (window.showToast) window.showToast(`${n.icon} ${n.title}`, "info");
}

function showChatPopup(data) {
  const toast = document.createElement("div");
  toast.className = "chat-notification-popup";
  toast.innerHTML = `
      <div class="toast-header">
          <strong>💬 ${escapeHtml(data.senderName)}</strong>
          <button onclick="this.parentElement.parentElement.remove()" style="border:none; background:none; font-size:1.2rem; cursor:pointer;">&times;</button>
      </div>
      <div class="toast-body">
          <p style="margin-bottom: 12px; color: #444;">${escapeHtml(data.preview)}</p>
          <div style="display: flex; gap: 8px;">
              <button class="reply-btn" style="flex: 1;" onclick="openQuickReply('${data.bookingId}', '${escapeHtml(data.senderName)}')">
                  Quick Reply
              </button>
              <button class="btn-outline-small" style="flex: 1; border: 1px solid #d86b3d; color: #d86b3d; background: transparent; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                  onclick="window.location.href='messages.html?bookingId=${data.bookingId}'">
                  View Chat
              </button>
          </div>
      </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast && toast.parentElement) toast.remove(); }, 10000);
}

/* ================================================================
   NOTIFICATION BELL — floating widget, injected next to the theme
   toggle (see js/theme.js). Only shown when logged in.
================================================================ */
function injectBell() {
  if (!uToken || document.getElementById("notif-bell-btn")) return;

  let wrap = document.getElementById("dastyaab-widgets");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "dastyaab-widgets";
    document.body.appendChild(wrap);
  }

  const btn = document.createElement("button");
  btn.id = "notif-bell-btn";
  btn.className = "dw-btn";
  btn.title = "Notifications";
  btn.setAttribute("aria-label", "Notifications");
  btn.innerHTML = `🔔<span class="dw-badge" id="notif-badge" style="display:none;">0</span>`;

  const panel = document.createElement("div");
  panel.id = "notif-panel";
  panel.className = "dw-panel";
  panel.innerHTML = `
    <div class="dw-panel-header">
      <span>Notifications</span>
      <button id="notif-clear-btn">Clear all</button>
    </div>
    <div id="notif-list"></div>
  `;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      unreadCount = 0;
      updateBellUI();
      renderNotifList();
    }
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove("open");
  });

  wrap.appendChild(btn);
  document.body.appendChild(panel);

  panel.querySelector("#notif-clear-btn").addEventListener("click", () => {
    notifications = [];
    renderNotifList();
  });

  renderNotifList();
}

function renderNotifList() {
  const list = document.getElementById("notif-list");
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = `<div class="dw-notif-empty">No notifications yet</div>`;
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="dw-notif" onclick="window.location.href='${n.href}'">
      <div>${n.icon} <strong>${escapeHtml(n.title)}</strong></div>
      <div>${escapeHtml(n.body)}</div>
      <div class="dw-notif-time">${timeAgo(n.time)}</div>
    </div>
  `).join("");
}

function updateBellUI() {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;
  if (unreadCount > 0) {
    badge.style.display = "flex";
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
  } else {
    badge.style.display = "none";
  }
}

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

window.openQuickReply = function(bookingId, senderName) {
    activeBookingId = bookingId;
    const overlay = document.getElementById("quick-reply-overlay");
    if (overlay) {
        document.getElementById("reply-to-name").textContent = `Reply to ${senderName}`;
        overlay.style.display = "flex";
        document.getElementById("quick-reply-text").focus();
    } else {
        console.error("Quick Reply HTML Modal is missing from this page!");
    }
};

window.closeQuickReply = function() {
    const overlay = document.getElementById("quick-reply-overlay");
    if (overlay) overlay.style.display = "none";
    document.getElementById("quick-reply-text").value = "";
};

function initQuickReply() {
    const sendBtn = document.getElementById("send-quick-reply");

    if (sendBtn) {
        sendBtn.onclick = () => {
            const textInput = document.getElementById("quick-reply-text");
            const text = textInput.value.trim();

            if (text && activeBookingId && socket) {
                socket.emit("message:send", { bookingId: activeBookingId, text });
                window.closeQuickReply();
                document.querySelectorAll(".chat-notification-popup").forEach(t => t.remove());
            }
        };
    }
}

function initWidgets() {
    initQuickReply();
    injectBell();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidgets);
} else {
    initWidgets();
}
