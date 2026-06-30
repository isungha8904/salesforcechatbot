// Salesforce 길잡이 — 임베드형 챗봇 위젯
// 사용법: 아무 HTML 페이지의 </body> 앞에 아래 한 줄을 추가하세요.
//   <script src="https://<당신의-vercel-주소>/widget.js" defer></script>
// 그러면 우측 하단에 채팅 버블이 자동으로 나타납니다.
(function () {
  // 이 스크립트가 로드된 origin을 알아내서 /api/chat 을 절대경로로 호출한다.
  // (다른 도메인 사이트에 붙여도 Vercel의 API를 정확히 가리키게 하기 위함)
  var thisScript =
    document.currentScript ||
    (function () {
      var ss = document.getElementsByTagName("script");
      for (var i = ss.length - 1; i >= 0; i--) {
        if (ss[i].src && ss[i].src.indexOf("widget.js") !== -1) return ss[i];
      }
      return null;
    })();
  var BASE = thisScript ? new URL(thisScript.src).origin : "";
  var API = BASE + "/api/chat";

  // 중복 삽입 방지
  if (document.getElementById("sfgw-bubble")) return;

  // ===== 스타일 주입 (sfgw- 접두사로 호스트 페이지와 충돌 방지) =====
  var css = `
  .sfgw-bubble{position:fixed;right:24px;bottom:24px;width:64px;height:64px;border-radius:50%;
    background:#00a1e0;border:none;cursor:pointer;box-shadow:0 6px 18px rgba(0,161,224,.45);
    display:flex;align-items:center;justify-content:center;z-index:2147483000;
    transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}
  .sfgw-bubble:hover{transform:scale(1.06);box-shadow:0 8px 22px rgba(0,161,224,.55)}
  .sfgw-bubble svg{width:30px;height:30px;fill:#fff}
  .sfgw-bubble.sfgw-hidden{opacity:0;transform:scale(.5);pointer-events:none}
  .sfgw-panel{position:fixed;right:24px;bottom:24px;width:380px;height:580px;max-height:calc(100vh - 48px);
    background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(3,45,96,.28);display:flex;flex-direction:column;
    overflow:hidden;z-index:2147483001;transform-origin:bottom right;transform:scale(.2);opacity:0;pointer-events:none;
    font-family:"Salesforce Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
    color:#16325c;transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s ease}
  .sfgw-panel.sfgw-open{transform:scale(1);opacity:1;pointer-events:auto}
  .sfgw-header{background:linear-gradient(135deg,#00a1e0,#0085bd);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
  .sfgw-logo{width:34px;height:34px;background:rgba(255,255,255,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sfgw-logo svg{width:22px;height:22px;fill:#fff}
  .sfgw-title{flex:1;line-height:1.2}
  .sfgw-title strong{display:block;font-size:15px}
  .sfgw-title span{font-size:12px;opacity:.85}
  .sfgw-actions{display:flex;gap:4px}
  .sfgw-actions button{background:transparent;border:none;color:#fff;width:30px;height:30px;border-radius:6px;cursor:pointer;
    font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s ease}
  .sfgw-actions button:hover{background:rgba(255,255,255,.2)}
  .sfgw-messages{flex:1;overflow-y:auto;padding:16px;background:#f3f6f9;display:flex;flex-direction:column;gap:12px}
  .sfgw-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
  .sfgw-msg.sfgw-bot{align-self:flex-start;background:#fff;border:1px solid #e5e9ee;border-bottom-left-radius:4px;color:#16325c}
  .sfgw-msg.sfgw-user{align-self:flex-end;background:#00a1e0;color:#fff;border-bottom-right-radius:4px}
  .sfgw-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
  .sfgw-chip{background:#fff;border:1px solid #00a1e0;color:#0085bd;border-radius:999px;padding:7px 12px;font-size:12.5px;cursor:pointer;transition:background .15s,color .15s}
  .sfgw-chip:hover{background:#00a1e0;color:#fff}
  .sfgw-typing{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:#fff;border:1px solid #e5e9ee;border-radius:14px;border-bottom-left-radius:4px}
  .sfgw-typing span{width:7px;height:7px;background:#00a1e0;border-radius:50%;animation:sfgw-blink 1.2s infinite both}
  .sfgw-typing span:nth-child(2){animation-delay:.2s}
  .sfgw-typing span:nth-child(3){animation-delay:.4s}
  @keyframes sfgw-blink{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
  .sfgw-input{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e9ee;background:#fff}
  .sfgw-input textarea{flex:1;resize:none;border:1px solid #e5e9ee;border-radius:10px;padding:10px 12px;font-family:inherit;
    font-size:14px;max-height:100px;outline:none;transition:border-color .15s,box-shadow .15s}
  .sfgw-input textarea:focus{border-color:#00a1e0;box-shadow:0 0 0 3px rgba(0,161,224,.18)}
  .sfgw-input button{background:#00a1e0;border:none;color:#fff;width:44px;border-radius:10px;cursor:pointer;display:flex;
    align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
  .sfgw-input button:hover:not(:disabled){background:#0085bd}
  .sfgw-input button:disabled{opacity:.5;cursor:not-allowed}
  .sfgw-input button svg{width:20px;height:20px;fill:#fff}
  @media (max-width:480px){.sfgw-panel{right:0;bottom:0;width:100vw;height:100vh;max-height:100vh;border-radius:0}}
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ===== DOM 주입 =====
  var bubble = document.createElement("button");
  bubble.className = "sfgw-bubble";
  bubble.id = "sfgw-bubble";
  bubble.setAttribute("aria-label", "챗봇 열기");
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 5H7v-2h6v2zm4-6H7V6h10v2z"/></svg>';

  var panel = document.createElement("div");
  panel.className = "sfgw-panel";
  panel.id = "sfgw-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Salesforce 길잡이 챗봇");
  panel.innerHTML =
    '<div class="sfgw-header">' +
    '<div class="sfgw-logo"><svg viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg></div>' +
    '<div class="sfgw-title"><strong>Salesforce 길잡이</strong><span>입문자 가이드 · AI 챗봇</span></div>' +
    '<div class="sfgw-actions"><button id="sfgw-min" title="최소화" aria-label="최소화">─</button><button id="sfgw-close" title="닫기" aria-label="닫기">×</button></div>' +
    "</div>" +
    '<div class="sfgw-messages" id="sfgw-messages"></div>' +
    '<div class="sfgw-input"><textarea id="sfgw-text" rows="1" placeholder="궁금한 점을 입력하세요…"></textarea>' +
    '<button id="sfgw-send" aria-label="전송"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></button></div>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector("#sfgw-messages");
  var input = panel.querySelector("#sfgw-text");
  var sendBtn = panel.querySelector("#sfgw-send");

  var history = [];
  var started = false;
  var waiting = false;
  var EXAMPLES = [
    "Salesforce 어드민이 뭐예요?",
    "개발자가 되려면 뭐부터 배워야 하나요?",
    "컨설턴트 자격증 종류가 궁금해요",
    "슈퍼유저는 무슨 일을 하나요?",
  ];

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addMessage(text, who) {
    var el = document.createElement("div");
    el.className = "sfgw-msg sfgw-" + who;
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }
  function showWelcome() {
    addMessage(
      "안녕하세요! 저는 Salesforce 입문자를 돕는 '길잡이'예요 ☁️\n어드민·개발자·컨설턴트·슈퍼유저, 어떤 길이 궁금하신가요? 아래 예시를 눌러보거나 자유롭게 질문해 주세요!",
      "bot"
    );
    var chips = document.createElement("div");
    chips.className = "sfgw-chips";
    EXAMPLES.forEach(function (q) {
      var chip = document.createElement("button");
      chip.className = "sfgw-chip";
      chip.textContent = q;
      chip.addEventListener("click", function () {
        if (!waiting) send(q);
      });
      chips.appendChild(chip);
    });
    messagesEl.appendChild(chips);
    scrollToBottom();
  }
  function showTyping() {
    var el = document.createElement("div");
    el.className = "sfgw-typing";
    el.id = "sfgw-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(el);
    scrollToBottom();
  }
  function hideTyping() {
    var el = document.getElementById("sfgw-typing");
    if (el) el.remove();
  }
  function openPanel() {
    panel.classList.add("sfgw-open");
    bubble.classList.add("sfgw-hidden");
    if (!started) {
      started = true;
      showWelcome();
    }
    setTimeout(function () {
      input.focus();
    }, 250);
  }
  function closePanel() {
    panel.classList.remove("sfgw-open");
    bubble.classList.remove("sfgw-hidden");
  }
  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  }

  async function send(text) {
    var trimmed = (text != null ? text : input.value).trim();
    if (!trimmed || waiting) return;
    var chips = messagesEl.querySelector(".sfgw-chips");
    if (chips) chips.remove();

    addMessage(trimmed, "user");
    history.push({ role: "user", text: trimmed });
    input.value = "";
    autoGrow();

    waiting = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      var res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      var data = await res.json();
      hideTyping();
      if (!res.ok) {
        addMessage("⚠️ " + (data.error || "오류가 발생했습니다. 잠시 후 다시 시도해 주세요."), "bot");
      } else {
        addMessage(data.reply, "bot");
        history.push({ role: "model", text: data.reply });
      }
    } catch (err) {
      hideTyping();
      addMessage("⚠️ 서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.", "bot");
    } finally {
      waiting = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  bubble.addEventListener("click", openPanel);
  panel.querySelector("#sfgw-min").addEventListener("click", closePanel);
  panel.querySelector("#sfgw-close").addEventListener("click", closePanel);
  sendBtn.addEventListener("click", function () {
    send();
  });
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
