/* Metavis1on v5 — 2026 Performance Build
  - Scroll/resize throttle
  - Canvas FX sadece uygun cihazda + görünürken çalışır
  - Tilt kaldırıldı (en çok kasanlardan biri)
  - Discord fetch: AbortController + cache + daha sakin interval
  - Command palette: daha stabil
*/

const CONFIG = {
  DISCORD: {
    INVITE_CODE: "metavis1on",
    GUILD_ID: "1312568133399085106",
    POLL_MS: 90000 // 90sn (daha az agresif)
  },
  FX: {
    ENABLED: true
  }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

// ---------------------
// Small utils
// ---------------------
function rafThrottle(fn){
  let raf = 0;
  return (...args) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      fn(...args);
    });
  };
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// ---------------------
// Accent toggle (fix text logic) + persist
// ---------------------
(() => {
  const btn = $("#accentToggle");
  if (!btn) return;

  const html = document.documentElement;
  const KEY = "mv_accent_v5";
  const saved = localStorage.getItem(KEY);

  if (saved === "purple") html.setAttribute("data-accent","purple");
  btn.textContent = (html.getAttribute("data-accent")==="purple") ? "Cyan" : "Mor";

  btn.addEventListener("click", () => {
    const cur = html.getAttribute("data-accent");
    const next = (cur === "purple") ? "cyan" : "purple";
    html.setAttribute("data-accent", next);
    btn.textContent = (next === "purple") ? "Cyan" : "Mor";
    localStorage.setItem(KEY, next);
  });
})();

// ---------------------
// Scroll reveal
// ---------------------
(() => {
  const els = $$(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting){
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
})();

// ---------------------
// Nav active highlight
// ---------------------
(() => {
  const navLinks = $$(".nav-link");
  if (!navLinks.length) return;

  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  const onScroll = rafThrottle(() => {
    const y = window.scrollY + 120;
    let active = 0;
    for (let i=0;i<sections.length;i++){
      if (sections[i].offsetTop <= y) active = i;
    }
    navLinks.forEach((a,i)=>a.classList.toggle("active", i===active));
  });

  onScroll();
  addEventListener("scroll", onScroll, { passive:true });
})();

// ---------------------
// Scroll progress bar
// ---------------------
(() => {
  const bar = $("#scrollProgress");
  if (!bar) return;

  const onScroll = rafThrottle(() => {
    const h = document.documentElement;
    const denom = (h.scrollHeight - h.clientHeight) || 1;
    const p = (h.scrollTop / denom) * 100;
    bar.style.width = p.toFixed(2) + "%";
  });

  onScroll();
  addEventListener("scroll", onScroll, { passive:true });
})();

// ---------------------
// Mobile burger menu (body lock more safe)
// ---------------------
(() => {
  const burger = $("#burger");
  const mobileNav = $("#mobileNav");
  if (!burger || !mobileNav) return;

  function setOpen(open){
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobileNav.hidden = !open;

    document.documentElement.classList.toggle("lock", open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  burger.addEventListener("click", () => setOpen(!burger.classList.contains("open")));
  mobileNav.addEventListener("click", (e) => {
    if (e.target.closest(".m-link") || e.target.closest(".m-cta")) setOpen(false);
  });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();

// ---------------------
// Modal logic
// ---------------------
(() => {
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-modal]");
    if (openBtn){
      const sel = openBtn.getAttribute("data-modal");
      const m = document.querySelector(sel);
      if (m) m.classList.add("show");
      return;
    }
    if (e.target.matches("[data-close]") || e.target.closest("[data-close]")){
      e.target.closest(".modal")?.classList.remove("show");
      return;
    }
    if (e.target.classList.contains("modal")) e.target.classList.remove("show");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal.show").forEach(m => m.classList.remove("show"));
  });
})();

// ---------------------
// Discord stats (widget -> invite fallback)
// ---------------------
const $active = $("#activeCount");
const $channels = $("#channelCount");
const $status = $("#apiStatus");
const $onlineAvatars = $("#onlineAvatars");

function setStatus(text){
  if ($status) $status.textContent = text;
}

function animateNumber(el, to, ms = 700){
  if (!el) return;
  const from = parseInt((el.textContent || "").replace(/\D/g,"")) || 0;
  const start = performance.now();
  const step = (t) => {
    const k = clamp((t - start) / ms, 0, 1);
    const ease = 1 - Math.pow(1-k,3);
    const v = Math.round(from + (to - from) * ease);
    el.textContent = String(v);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function fetchJson(url, timeoutMs = 6500){
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try{
    const res = await fetch(url, { cache:"no-store", signal: ac.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function updateDiscordStats(){
  try{
    setStatus("Bağlanıyor…");

    // 1) Widget
    if (CONFIG.DISCORD.GUILD_ID){
      const data = await fetchJson(`https://discord.com/api/guilds/${CONFIG.DISCORD.GUILD_ID}/widget.json`);
      const presence = data?.presence_count ?? null;
      const channels = Array.isArray(data?.channels) ? data.channels.length : null;

      if (presence != null) animateNumber($active, presence);
      else if ($active) $active.textContent = "—";

      if ($channels) $channels.textContent = (channels != null) ? String(channels) : "—";

      // Avatars
      if ($onlineAvatars){
        $onlineAvatars.innerHTML = "";
        const members = Array.isArray(data?.members) ? data.members : [];
        members.slice(0, 14).forEach(m => {
          const img = document.createElement("img");
          img.src = m.avatar_url || "assets/logo.png";
          img.alt = (m.username || "Üye") + " çevrimiçi";
          img.className = "avatar-img";
          img.loading = "lazy";
          img.decoding = "async";
          $onlineAvatars.appendChild(img);
        });
      }

      setStatus("Bağlı");
      return;
    }

    // 2) Invite fallback
    const inv = await fetchJson(`https://discord.com/api/v10/invites/${CONFIG.DISCORD.INVITE_CODE}?with_counts=true&with_expiration=true`);
    const presence = inv?.approximate_presence_count ?? inv?.approximate_member_count ?? null;

    if (presence != null) animateNumber($active, presence);
    else if ($active) $active.textContent = "—";

    if ($channels) $channels.textContent = "—";
    setStatus("Bağlı");

  } catch (err){
    console.warn("[Discord]", err);
    setStatus("Bağlantı yok");
    if ($active && (!$active.textContent || $active.textContent === "—")) $active.textContent = "—";
    if ($channels && (!$channels.textContent || $channels.textContent === "—")) $channels.textContent = "—";
  }
}

updateDiscordStats();
setInterval(updateDiscordStats, CONFIG.DISCORD.POLL_MS);

// ---------------------
// Project search + tag filter
// ---------------------
(() => {
  const projSearch = $("#projSearch");
  const tagbar = $(".tagbar");
  const projectGrid = $("#projectGrid");
  if (!projectGrid) return;

  function apply(){
    const q = (projSearch?.value || "").toLowerCase().trim();
    const activeTagBtn = $(".tag.is-active");
    const tag = activeTagBtn?.getAttribute("data-tag") || "all";

    $$(".card", projectGrid).forEach(card => {
      const title = $(".card-title", card)?.textContent.toLowerCase() || "";
      const text = $(".card-text", card)?.textContent.toLowerCase() || "";
      const tags = (card.getAttribute("data-tags") || "").split(/\s+/);

      const matchText = !q || title.includes(q) || text.includes(q);
      const matchTag = tag === "all" || tags.includes(tag);

      card.style.display = (matchText && matchTag) ? "" : "none";
    });
  }

  projSearch?.addEventListener("input", rafThrottle(apply));
  tagbar?.addEventListener("click", (e) => {
    const btn = e.target.closest(".tag");
    if (!btn) return;
    $$(".tag", tagbar).forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    apply();
  });

  apply();
})();

// ---------------------
// Copy invite
// ---------------------
async function copyInvite(){
  const url = "https://discord.gg/" + CONFIG.DISCORD.INVITE_CODE;
  try{
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
function flash(btn, okText="Kopyalandı!", failText="Kopyalanamadı"){
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = okText;
  setTimeout(() => btn.textContent = old, 1200);
}
$("#copyInvite")?.addEventListener("click", async (e) => {
  const ok = await copyInvite();
  flash(e.currentTarget, ok ? "Kopyalandı!" : "Kopyalanamadı");
});
$("#copyInvite2")?.addEventListener("click", async (e) => {
  const ok = await copyInvite();
  flash(e.currentTarget, ok ? "Kopyalandı!" : "Kopyalanamadı");
});

// ---------------------
// Command Palette (Ctrl/Cmd+K)
// ---------------------
(() => {
  const cmdModal = $("#cmdk");
  const cmdInput = $("#cmdInput");
  const cmdList = $("#cmdList");
  const openBtn = $("#cmdOpen");
  if (!cmdModal || !cmdInput || !cmdList) return;

  function open(){
    cmdModal.classList.add("show");
    cmdInput.value = "";
    filter("");
    setTimeout(()=>cmdInput.focus(), 30);
  }
  function close(){
    cmdModal.classList.remove("show");
  }
  function filter(q){
    const items = $$("#cmdList li");
    const qq = q.toLowerCase();
    items.forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(qq) ? "" : "none";
    });
  }

  openBtn?.addEventListener("click", open);

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "k"){
      e.preventDefault();
      open();
    }
    if (e.key === "Escape") close();
  });

  cmdInput.addEventListener("input", (e)=>filter(e.target.value));

  cmdList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const [action, value] = li.getAttribute("data-cmd").split(":");
    if (action === "go"){
      document.querySelector(value)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
    if (action === "copy" && value === "invite") copyInvite();
    if (action === "open" && value === "discord") window.open("https://discord.gg/" + CONFIG.DISCORD.INVITE_CODE, "_blank", "noopener");
    if (action === "accent" && value === "toggle") $("#accentToggle")?.click();
    close();
  });

  // click outside
  cmdModal.addEventListener("click", (e) => {
    if (e.target === cmdModal) close();
  });
})();

// ---------------------
// Back to top
// ---------------------
(() => {
  const toTop = $("#toTop");
  if (!toTop) return;

  const onScroll = rafThrottle(() => {
    if (window.scrollY > 520) toTop.classList.add("show");
    else toTop.classList.remove("show");
  });

  onScroll();
  addEventListener("scroll", onScroll, { passive:true });

  toTop.addEventListener("click", () => {
    window.scrollTo({ top:0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
})();

// ---------------------
// Footer year
// ---------------------
(() => {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

// ---------------------
// FX Canvas (Auto quality / pause when tab hidden)
// ---------------------
(() => {
  if (!CONFIG.FX.ENABLED) return;
  if (prefersReducedMotion) return;

  const canvas = $("#fx");
  if (!canvas) return;

  // düşük cihaz tahmini: küçük CPU, mobil, düşük RAM vb (basit heuristik)
  const isSmallDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                        (innerWidth < 820);

  if (isSmallDevice) return; // kasmayı sıfırlamak için düşük cihazda efekt kapalı

  // FX enable
  canvas.style.opacity = ".65";

  const ctx = canvas.getContext("2d", { alpha:true });
  let w=0, h=0, dpr = Math.min(devicePixelRatio || 1, 2);
  let running = true;

  function resize(){
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }
  resize();
  addEventListener("resize", rafThrottle(resize));

  // particles
  const N = 42;
  const dots = Array.from({length:N}, () => ({
    x: Math.random()*w, y: Math.random()*h,
    vx: (Math.random()-0.5)*0.22*dpr,
    vy: (Math.random()-0.5)*0.22*dpr,
    r: (Math.random()*1.8+0.7)*dpr
  }));

  function accentColor(){
    return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22d3ee";
  }

  function step(){
    if (!running) return;

    ctx.clearRect(0,0,w,h);

    const col = accentColor();
    for (const p of dots){
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      const R = p.r * 7;
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R);
      g.addColorStop(0, col);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x,p.y,R,0,Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  // pause when tab hidden
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(step);
  });

  requestAnimationFrame(step);
})();
/* =========================
   ADMIN + ACIL YAYIN
========================= */

const ADMIN_PASSWORD = "metavis1on-admin"; // değiştir

const LS = {
  AUTH: "mv_admin_auth",
  ACTIVE: "mv_video_active",
  URL: "mv_video_url",
  EXPIRE: "mv_video_expire"
};

/* ================= ADMIN PANEL ================= */
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {

  const loginBox   = document.getElementById("loginBox");
  const panelBox   = document.getElementById("panelBox");
  const adminPass  = document.getElementById("adminPass");
  const logoutBtn  = document.getElementById("logoutBtn");
  const enableBtn  = document.getElementById("enableVideo");
  const disableBtn = document.getElementById("disableVideo");
  const videoUrl   = document.getElementById("videoUrl");
  const videoMode  = document.getElementById("videoMode");

  // Oturum kontrolü
  if (localStorage.getItem(LS.AUTH) === "true") {
    loginBox.classList.add("hidden");
    panelBox.classList.remove("hidden");
  }

  loginBtn.onclick = () => {
    if (adminPass.value === ADMIN_PASSWORD) {
      localStorage.setItem(LS.AUTH, "true");
      loginBox.classList.add("hidden");
      panelBox.classList.remove("hidden");
    } else {
      alert("Şifre hatalı");
    }
  };

  logoutBtn.onclick = () => {
    localStorage.removeItem(LS.AUTH);
    location.reload();
  };

  enableBtn.onclick = () => {
    const url = videoUrl.value.trim();

    if (!url.endsWith(".mp4")) {
      alert("Sadece MP4 dosyaları desteklenir");
      return;
    }

    localStorage.setItem(LS.ACTIVE, "true");
    localStorage.setItem(LS.URL, url);

    if (videoMode.value === "24h") {
      localStorage.setItem(LS.EXPIRE, Date.now() + 86400000);
    } else {
      localStorage.removeItem(LS.EXPIRE);
    }

    alert("Acil yayın AKTİF");
  };

  disableBtn.onclick = () => {
    localStorage.removeItem(LS.ACTIVE);
    localStorage.removeItem(LS.URL);
    localStorage.removeItem(LS.EXPIRE);
    alert("Acil yayın KAPATILDI");
  };
}

/* ================= SITE TARAFI ================= */
(() => {
  if (localStorage.getItem(LS.ACTIVE) !== "true") return;

  const exp = localStorage.getItem(LS.EXPIRE);
  if (exp && Date.now() > Number(exp)) {
    localStorage.removeItem(LS.ACTIVE);
    return;
  }

  const url = localStorage.getItem(LS.URL);
  if (!url) return;

  // ACIL YAYIN MODE — GLOBAL RESET
document.documentElement.style.background = "#000";
document.body.style.background = "#000";
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";

document.body.innerHTML = `
  <div id="emergencyOverlay" style="
    position:fixed;
    inset:0;
    z-index:999999;
    background:#000;
    display:flex;
    flex-direction:column;
  ">
    <div style="
      height:64px;
      display:flex;
      align-items:center;
      gap:12px;
      padding:0 18px;
      background:rgba(0,0,0,.85);
      border-bottom:1px solid rgba(255,255,255,.15);
      flex-shrink:0;
    ">
      <img src="assets/logo.png" style="
        width:34px;
        height:34px;
        border-radius:10px;
      ">
      <span style="
        font-weight:900;
        color:#fff;
        letter-spacing:.3px;
      ">
        Metavis1on — Duyuru
      </span>
    </div>

    <div style="
      flex:1;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#000;
    ">
      <video
        src="${url}"
        autoplay
        controls
        playsinline
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          background:#000;
        "
      ></video>
    </div>
  </div>
`;
})();