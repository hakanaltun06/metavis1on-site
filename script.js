/* Metavis1on — Interactions & Integrations v3
   - Scroll progress bar
   - Scroll reveal
   - Parallax hero
   - Nav active highlight
   - Accent color toggle (Cyan/Purple)
   - Mobile burger menu (accessible)
   - Command Palette (Ctrl/Cmd+K)
   - Discord aktif üye (widget.json -> presence_count; fallback: invite counts)
   - Online avatars from widget
   - Animated counters
   - Project search + tag filter
   - Copy invite
   - Neon particles canvas
   - Tilt hover on cards
   - Back to top
   - Footer year
*/

// =========================
// Config
// =========================
const CONFIG = {
  DISCORD: {
    INVITE_CODE: "metavis1on",          // https://discord.gg/metavis1on
    GUILD_ID: "1312568133399085106",    // Widget açık olmalı (Server Settings → Widget → Enable)
    POLL_MS: 60000                      // 60 sn
  }
};

// Helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// =========================
// Accent toggle (Cyan <-> Purple) + persist
// =========================
const accentToggle = $("#accentToggle");
if (accentToggle) {
  const html = document.documentElement;
  const LS_KEY = "mv_accent";
  const saved = localStorage.getItem(LS_KEY);
  if (saved === "purple") {
    html.setAttribute("data-accent", "purple");
    accentToggle.textContent = "Cyan";
  }
  accentToggle.addEventListener("click", () => {
    const cur = html.getAttribute("data-accent");
    const nxt = cur === "purple" ? "cyan" : "purple";
    html.setAttribute("data-accent", nxt);
    accentToggle.textContent = nxt === "purple" ? "Cyan" : "Mor";
    localStorage.setItem(LS_KEY, nxt);
  });
}

// =========================
// Scroll reveal
// =========================
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);
$$(".reveal").forEach(el => io.observe(el));

// =========================
/* Nav Active highlight on scroll */
// =========================
const navLinks = $$(".nav-link");
const sections = navLinks.map(a => $(a.getAttribute("href")));
function setActiveLink() {
  const y = window.scrollY + 110;
  let active = 0;
  sections.forEach((sec, i) => { if (sec && sec.offsetTop <= y) active = i; });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === active));
}
setActiveLink();
addEventListener("scroll", setActiveLink, { passive: true });

// =========================
// Scroll progress bar
// =========================
const scrollBar = $("#scrollProgress");
function updateScrollBar() {
  const h = document.documentElement;
  const perc = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  scrollBar.style.width = perc + "%";
}
updateScrollBar();
addEventListener("scroll", updateScrollBar, { passive: true });

// =========================
// Parallax hero
// =========================
const hero = $(".hero[data-parallax]");
if (hero) {
  addEventListener("scroll", () => {
    const y = window.scrollY;
    hero.style.transform = `translate3d(0, ${y * -0.05}px, 0)`;
  }, { passive: true });
}

// =========================
// Mobile burger menu
// =========================
const burger = $("#burger");
const mobileNav = $("#mobileNav");
function setMobileOpen(open) {
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
  if (open) {
    mobileNav.hidden = false;
    document.body.style.overflow = "hidden";
  } else {
    mobileNav.hidden = true;
    document.body.style.overflow = "";
  }
}
if (burger) {
  burger.addEventListener("click", () => setMobileOpen(!burger.classList.contains("open")));
  mobileNav?.addEventListener("click", (e) => {
    if (e.target.classList.contains("m-link") || e.target.classList.contains("m-cta")) setMobileOpen(false);
  });
}

// =========================
// Modal logic (project modals + cmdk)
// =========================
document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-modal]");
  if (openBtn) {
    const sel = openBtn.getAttribute("data-modal");
    const m = document.querySelector(sel);
    if (m) m.classList.add("show");
  }
  if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) {
    e.target.closest(".modal")?.classList.remove("show");
  }
  if (e.target.classList.contains("modal")) e.target.classList.remove("show");
});

// =========================
// Discord Aktif Üye: Widget -> Invite fallback
// =========================
const $active = $("#activeCount");
const $channels = $("#channelCount");
const $status = $("#apiStatus");
const $onlineAvatars = $("#onlineAvatars");

// Smooth counter animation
function animateNumber(el, to, ms = 700) {
  const from = parseInt(el.textContent.replace(/\D/g, "")) || 0;
  const start = performance.now();
  function tick(t) {
    const k = Math.min(1, (t - start) / ms);
    const ease = 1 - Math.pow(1 - k, 3);
    const val = Math.round(from + (to - from) * ease);
    el.textContent = String(val);
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function fetchFromWidget(guildId) {
  const url = `https://discord.com/api/guilds/${guildId}/widget.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Widget fetch failed");
  return res.json();
}
async function fetchFromInvite(inviteCode) {
  const url = `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Invite fetch failed");
  return res.json();
}

async function updateDiscordStats() {
  try {
    $status.textContent = "• • •";
    if (CONFIG.DISCORD.GUILD_ID) {
      const data = await fetchFromWidget(CONFIG.DISCORD.GUILD_ID);
      const presence = data?.presence_count;
      const channels = data?.channels?.length ?? null;

      if (presence != null) animateNumber($active, presence);
      else $active.textContent = "—";
      $channels.textContent = channels != null ? String(channels) : "—";
      $status.textContent = "OK";

      // Online avatar list (max 12)
      if (Array.isArray(data?.members) && $onlineAvatars) {
        $onlineAvatars.innerHTML = "";
        data.members.slice(0, 12).forEach(m => {
          const img = document.createElement("img");
          img.src = m.avatar_url || "assets/logo.png";
          img.alt = (m.username || "Üye") + " çevrimiçi";
          img.className = "avatar-img";
          img.loading = "lazy";
          $onlineAvatars.appendChild(img);
        });
      }
      return;
    }

    // Fallback: invite
    const inv = await fetchFromInvite(CONFIG.DISCORD.INVITE_CODE);
    const presence = inv?.approximate_presence_count ?? inv?.approximate_member_count ?? null;
    if (presence != null) animateNumber($active, presence);
    else $active.textContent = "—";
    $channels.textContent = "—";
    $status.textContent = "OK";
  } catch (err) {
    console.warn("[Discord]", err);
    $status.textContent = "HATA";
    if (!$active.textContent || $active.textContent === "—") $active.textContent = "—";
    if (!$channels.textContent || $channels.textContent === "—") $channels.textContent = "—";
  }
}
updateDiscordStats();
setInterval(updateDiscordStats, CONFIG.DISCORD.POLL_MS);

// =========================
// Project search + tag filter
// =========================
const projSearch = $("#projSearch");
const tagbar = $(".tagbar");
const projectGrid = $("#projectGrid");

function applyProjectFilter() {
  const q = (projSearch?.value || "").toLowerCase().trim();
  const activeTagBtn = $(".tag.is-active");
  const tag = activeTagBtn ? activeTagBtn.getAttribute("data-tag") : "all";

  $$(".card", projectGrid).forEach(card => {
    const title = $(".card-title", card)?.textContent.toLowerCase() || "";
    const text = $(".card-text", card)?.textContent.toLowerCase() || "";
    const tags = (card.getAttribute("data-tags") || "").split(/\s+/);
    const matchText = !q || title.includes(q) || text.includes(q);
    const matchTag = tag === "all" || tags.includes(tag);
    card.style.display = (matchText && matchTag) ? "" : "none";
  });
}
projSearch?.addEventListener("input", applyProjectFilter);
tagbar?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tag");
  if (!btn) return;
  $$(".tag", tagbar).forEach(b => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  applyProjectFilter();
});

// =========================
// Copy invite
// =========================
$("#copyInvite")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("https://discord.gg/" + CONFIG.DISCORD.INVITE_CODE);
    const btn = $("#copyInvite");
    const old = btn.textContent;
    btn.textContent = "Kopyalandı!";
    setTimeout(() => (btn.textContent = old), 1200);
  } catch { /* fail silently */ }
});

// =========================
// Command Palette (Ctrl/Cmd+K)
// =========================
const cmdModal = $("#cmdk");
const cmdInput = $("#cmdInput");
const cmdList = $("#cmdList");
function openCmd() {
  cmdModal.classList.add("show");
  cmdInput.value = "";
  filterCmd("");
  setTimeout(() => cmdInput.focus(), 30);
}
function closeCmd() { cmdModal.classList.remove("show"); }
function filterCmd(q) {
  const items = $$("#cmdList li");
  items.forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(q.toLowerCase()) ? "" : "none";
  });
}
$("#cmdOpen")?.addEventListener("click", openCmd);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); }
  if (e.key === "Escape") closeCmd();
});
cmdInput?.addEventListener("input", (e) => filterCmd(e.target.value));
cmdList?.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const [action, value] = li.getAttribute("data-cmd").split(":");
  if (action === "go") { document.querySelector(value)?.scrollIntoView({ behavior: "smooth" }); }
  if (action === "copy" && value === "invite") navigator.clipboard.writeText("https://discord.gg/" + CONFIG.DISCORD.INVITE_CODE);
  if (action === "open" && value === "discord") window.open("https://discord.gg/" + CONFIG.DISCORD.INVITE_CODE, "_blank", "noopener");
  if (action === "accent" && value === "toggle") accentToggle?.click();
  closeCmd();
});

// =========================
// Neon particles (lightweight)
// =========================
(function neonParticles(){
  const canvas = document.getElementById("neonBg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, pxRatio = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    w = canvas.width = innerWidth * pxRatio;
    h = canvas.height = innerHeight * pxRatio;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }
  resize(); addEventListener("resize", resize);

  const N = 48; // hafif
  const dots = Array.from({ length: N }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - .5) * .25 * pxRatio,
    vy: (Math.random() - .5) * .25 * pxRatio,
    r: (Math.random() * 1.8 + 0.6) * pxRatio
  }));

  function step() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 6);
      g.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue("--accent"));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 6, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

// =========================
// Tilt hover (cards, stats, feed)
// =========================
function addTilt(el){
  const r = 8; // max rotation deg
  const s = 1.008; // scale
  function onMove(e){
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * -r;
    const ry = (x - 0.5) * r;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
  }
  function reset(){ el.style.transform = ""; }
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", reset);
}
$$(".tilt").forEach(addTilt);

// =========================
// Back to top
// =========================
const toTop = $("#toTop");
function toggleToTop() {
  if (window.scrollY > 480) toTop.classList.add("show");
  else toTop.classList.remove("show");
}
toggleToTop();
addEventListener("scroll", toggleToTop, { passive: true });
toTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// =========================
// Footer year
// =========================
$("#year").textContent = String(new Date().getFullYear());

// =========================
// History: avoid auto scroll restore
// =========================
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
