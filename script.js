/* Metavis1on — Interactions & Integrations
   - Scroll reveal
   - Nav active highlight
   - Accent color toggle (Cyan/Purple)
   - Discord aktif üye sayısı (widget.json -> presence_count; fallback: invite counts)
   - Modal aç/kapat
*/

// =========================
// Config
// =========================
const CONFIG = {
  DISCORD: {
    INVITE_CODE: "metavis1on",     // https://discord.gg/metavis1on
    GUILD_ID: "1312568133399085106",                  // Örn: "123456789012345678" — Sunucu > Widget'ı açarsan kullan
    POLL_MS: 60000                 // 60 sn'de bir yenile
  }
};

// =========================
// Accent toggle (Cyan <-> Purple)
// =========================
const accentToggle = document.getElementById("accentToggle");
if (accentToggle) {
  const html = document.documentElement;
  const LS_KEY = "mv_accent";

  // Restore
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
/* Scroll Reveal */
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
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// =========================
/* Nav Active highlight on scroll */
// =========================
const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = navLinks.map(a => document.querySelector(a.getAttribute("href")));

function setActiveLink() {
  const y = window.scrollY + 110;
  let active = 0;
  sections.forEach((sec, i) => {
    if (sec && sec.offsetTop <= y) active = i;
  });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === active));
}
setActiveLink();
window.addEventListener("scroll", setActiveLink);

// =========================
/* Modal logic */
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
/* Discord Aktif Üye: Widget -> Invite fallback
   1) Sunucu Ayarları > Widget > Enable (Public)
   2) CONFIG.DISCORD.GUILD_ID doldur
   Çalışmazsa davet API’si ile approximate_presence_count denenir.
========================= */
const $active = document.getElementById("activeCount");
const $channels = document.getElementById("channelCount");
const $status = document.getElementById("apiStatus");

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
    // Önce Widget (en doğru presence_count)
    if (CONFIG.DISCORD.GUILD_ID) {
      const data = await fetchFromWidget(CONFIG.DISCORD.GUILD_ID);
      const presence = data?.presence_count;
      const channels = data?.channels?.length ?? "—";
      if (presence != null) $active.textContent = String(presence);
      else $active.textContent = "—";
      $channels.textContent = channels;
      $status.textContent = "OK";
      return;
    }

    // Widget yoksa davet API’si
    const inv = await fetchFromInvite(CONFIG.DISCORD.INVITE_CODE);
    const presence = inv?.approximate_presence_count ?? inv?.approximate_member_count ?? null;
    if (presence != null) $active.textContent = String(presence);
    else $active.textContent = "—";
    $channels.textContent = "—";
    $status.textContent = "OK";
  } catch (err) {
    console.warn("[Discord]", err);
    $status.textContent = "HATA";
    // Graceful fallback: değerler yoksa çizgi
    if (!$active.textContent || $active.textContent === "—") $active.textContent = "—";
    if (!$channels.textContent || $channels.textContent === "—") $channels.textContent = "—";
  }
}
updateDiscordStats();
setInterval(updateDiscordStats, CONFIG.DISCORD.POLL_MS);

// =========================
// Küçük UX: hash’e scroll sonrası fokus kaldır
// =========================
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
