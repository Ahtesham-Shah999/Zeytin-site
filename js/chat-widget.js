/* ===========================================================
   ZEYTIN — Chat Widget
   Floating bubble + panel, talks to an n8n webhook.

   SETUP: Replace WEBHOOK_URL below with your n8n Chat Trigger's
   "Production URL" (Webhook node URL) once your workflow is live.
   =========================================================== */

(function () {
  // ---- CONFIG ----
  const WEBHOOK_URL = "http://localhost:5678/webhook/968637bd-0efe-45a6-b2a6-514f9fc64771/chat";
  const DEMO_MODE = false; // live — talks to your real n8n workflow

  let sessionId = localStorage.getItem("zeytin_session_id");
  if (!sessionId) {
    sessionId = "zeytin-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("zeytin_session_id", sessionId);
  }

  const css = `
    .zw-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 60px; height: 60px; border-radius: 50%;
      background: #C4622D; color: #F2EDE4;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 8px 24px rgba(28,24,21,0.35);
      border: none; transition: transform 0.2s ease, background 0.2s ease;
      font-size: 26px;
    }
    .zw-bubble:hover { transform: scale(1.06); background: #E07A3E; }
    .zw-panel {
      position: fixed; bottom: 96px; right: 24px; z-index: 9999;
      width: 360px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 140px);
      background: #F2EDE4; border-radius: 12px;
      box-shadow: 0 16px 48px rgba(28,24,21,0.28);
      display: none; flex-direction: column; overflow: hidden;
      font-family: 'Inter', sans-serif;
    }
    .zw-panel.open { display: flex; }
    .zw-head {
      background: #1C1815; color: #F2EDE4; padding: 18px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    .zw-head .zw-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #C4622D;
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .zw-head h4 { margin: 0; font-size: 0.95rem; font-family: 'Fraunces', serif; font-weight: 600; }
    .zw-head span { font-size: 0.74rem; color: rgba(242,237,228,0.65); }
    .zw-close { margin-left: auto; background: none; border: none; color: #F2EDE4; font-size: 1.2rem; cursor: pointer; opacity: 0.7; }
    .zw-close:hover { opacity: 1; }
    .zw-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; background: #F2EDE4; }
    .zw-msg { max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 0.88rem; line-height: 1.45; }
    .zw-msg.bot { background: #fff; border: 1px solid #E6DFD2; align-self: flex-start; color: #1C1815; border-bottom-left-radius: 4px; }
    .zw-msg.user { background: #C4622D; color: #F2EDE4; align-self: flex-end; border-bottom-right-radius: 4px; }
    .zw-typing { align-self: flex-start; display: flex; gap: 4px; padding: 10px 14px; }
    .zw-typing span { width: 6px; height: 6px; border-radius: 50%; background: #A8763E; animation: zwTyping 1.2s infinite ease-in-out; }
    .zw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .zw-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes zwTyping { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
    .zw-input-row { display: flex; gap: 8px; padding: 14px; border-top: 1px solid #E6DFD2; background: #fff; }
    .zw-input-row input {
      flex: 1; border: 1px solid #E6DFD2; border-radius: 20px; padding: 10px 16px;
      font-size: 0.88rem; outline: none; font-family: 'Inter', sans-serif;
    }
    .zw-input-row input:focus { border-color: #C4622D; }
    .zw-input-row button {
      background: #C4622D; color: #fff; border: none; width: 38px; height: 38px;
      border-radius: 50%; cursor: pointer; flex-shrink: 0; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
    }
    .zw-input-row button:hover { background: #E07A3E; }
    .zw-demo-tag {
      font-size: 0.68rem; color: #A8763E; text-align: center; padding: 4px 0 0;
      background: #fff;
    }
    @media (max-width: 480px) {
      .zw-panel { width: calc(100vw - 24px); right: 12px; bottom: 84px; }
      .zw-bubble { right: 16px; bottom: 16px; }
    }
  `;
  const styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  const bubble = document.createElement("button");
  bubble.className = "zw-bubble";
  bubble.innerHTML = "💬";
  bubble.setAttribute("aria-label", "Open chat with Zeytin");

  const panel = document.createElement("div");
  panel.className = "zw-panel";
  panel.innerHTML = `
    <div class="zw-head">
      <div class="zw-avatar">🍢</div>
      <div>
        <h4>Zeytin</h4>
        <span>Usually replies in a few seconds</span>
      </div>
      <button class="zw-close" aria-label="Close chat">✕</button>
    </div>
    <div class="zw-body" id="zw-body"></div>
    <div class="zw-input-row">
      <input type="text" id="zw-input" placeholder="Ask about a table, hours, or the menu…" autocomplete="off">
      <button id="zw-send" aria-label="Send">➤</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const body = panel.querySelector("#zw-body");
  const input = panel.querySelector("#zw-input");
  const sendBtn = panel.querySelector("#zw-send");
  const closeBtn = panel.querySelector(".zw-close");

  function addMessage(text, who) {
    const m = document.createElement("div");
    m.className = "zw-msg " + who;
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const t = document.createElement("div");
    t.className = "zw-typing";
    t.id = "zw-typing-indicator";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() {
    const t = document.getElementById("zw-typing-indicator");
    if (t) t.remove();
  }

  function openPanel(prefill) {
    panel.classList.add("open");
    if (body.children.length === 0) {
      addMessage("Hi! I'm the Zeytin booking assistant. Tell me the day, time, and party size, and I'll check what's available.", "bot");
    }
    if (prefill) {
      input.value = prefill;
      setTimeout(() => sendMessage(), 300);
    }
    input.focus();
  }

  bubble.addEventListener("click", () => openPanel());
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  // Exposed so reservations.html sample bubbles can trigger the chat directly
  window.openZeytinChat = function (prefill) {
    openPanel(prefill);
  };

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    showTyping();

    if (DEMO_MODE) {
      // Local canned response so the widget is testable before n8n is wired up
      setTimeout(() => {
        hideTyping();
        addMessage(
          "This is demo mode — I'm not connected to the booking system yet. Once the n8n workflow is live, I'll check real availability and confirm your table right here.",
          "bot"
        );
      }, 900);
      return;
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          chatInput: text,
          metadata: { source: "zeytin-website", page: window.location.pathname }
        })
      });
      const data = await res.json();
      hideTyping();
      const reply = data.output || data.text || data.reply || "Sorry, I didn't catch that — could you try again?";
      addMessage(reply, "bot");
    } catch (err) {
      hideTyping();
      addMessage("I'm having trouble connecting right now. Please call +92 41 8765 432 or try again shortly.", "bot");
      console.error("Zeytin chat widget error:", err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
