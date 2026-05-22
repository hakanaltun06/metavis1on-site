/* ============================================================================
   metavis1on — Merkezi Site Yapılandırması
   ----------------------------------------------------------------------------
   Tüm yeni sayfalar (admin, public/projeler, apps) bu config dosyasını okur.
   Mevcut index.html / borc.html / tetris.html / game.html / visiocial.html
   bu dosyayı KULLANMAZ — onlar olduğu gibi çalışmaya devam eder.
   ============================================================================ */
(function () {
  'use strict';

  const SITE = {
    siteName: 'metavis1on',
    siteVersion: '10.0.0-alpha',
    brandTagline: 'Dijital Kimlik & Seçkin Ekosistem',
    domain: 'metavis1on.com',

    // Discord ana davet bağlantısı — mevcut script.js ile aynı değer.
    discordInvite: 'https://discord.gg/TRNyQBfs',

    // Tema sistemi — index.html'in mevcut tema motoruyla aynı anahtar kullanılır.
    themeKey: 'metavis1on_theme',
    defaultTheme: 'obsidian-cyan',
    themes: [
      { id: 'obsidian-cyan',   label: 'Elektrik Mavisi', dot: 'cyan'   },
      { id: 'obsidian-gold',   label: 'Obsidyen Altın',  dot: 'gold'   },
      { id: 'obsidian-purple', label: 'Neon Mor',        dot: 'purple' }
    ],

    // Bağlı uygulama / modül kayıtları.
    // legacyUrl   → şu an çalışan eski URL (mevcut dosyalar bozulmadı)
    // targetUrl   → gelecekte taşınacak hedef konum (henüz aktif değil)
    // visibility  → 'public'  : Projeler vitrininde direkt açılır
    //               'admin'   : Vitrinde gözükür ama admin login zorunlu
    //               'hidden'  : Vitrinde gözükmez (ileride kullanılır)
    apps: [
      {
        id: 'visiocial',
        name: 'Visiocial',
        description: 'Topluluk sosyal ağ prototipi. UI/UX demosu.',
        tag: 'Demo / Prototip',
        accent: 'purple',
        icon: 'ph-users-three',
        visibility: 'public',
        status: 'prototype',
        legacyUrl: '../visiocial.html',
        targetUrl: '../apps/visiocial/'
      },
      {
        id: 'tetris',
        name: 'Tetris',
        description: 'Neon temalı klasik Tetris. 3 görsel tema, mobil destek.',
        tag: 'Mini Oyun',
        accent: 'cyan',
        icon: 'ph-cube',
        visibility: 'public',
        status: 'stable',
        legacyUrl: '../tetris.html',
        targetUrl: '../apps/tetris/'
      },
      {
        id: 'grid',
        name: 'GRID',
        description: 'Sayı birleştirme bulmacası (2048 türevi), neon estetik.',
        tag: 'Mini Oyun',
        accent: 'gold',
        icon: 'ph-squares-four',
        visibility: 'public',
        status: 'stable',
        legacyUrl: '../game.html',
        targetUrl: '../apps/grid/'
      },
      {
        id: 'borc',
        name: 'Borç Yönetim Paneli',
        description: 'Topluluk içi borç takibi. Firebase senkron, taksit, grafik.',
        tag: 'Admin Only',
        accent: 'red',
        icon: 'ph-currency-circle-dollar',
        visibility: 'admin',
        status: 'production',
        legacyUrl: '../borc.html',
        targetUrl: '../admin/borc/'
      }
    ],

    // ---------- v11.0.5 eklemeleri (statik feed) ----------
    // Yeni duyuru/etkinlik eklemek için bu dizilere kayıt eklemek yeterlidir.
    // Backend yok; veri tamamen client-side okunur. Yeni alanlar mevcut
    // siteName / discordInvite / themes / apps yapısını etkilemez.
    announcements: [
      {
        id: 'portal-v11',
        date: 'Mayıs 2026',
        title: 'metavis1on portal yapısı yenileniyor',
        text: 'Ana site, projeler vitrini ve yönetim alanı daha modern bir yapıya taşınıyor.'
      },
      {
        id: 'apps-showcase',
        date: 'Mayıs 2026',
        title: 'Uygulamalar vitrini aktif',
        text: 'Visiocial, Tetris, GRID ve yönetim modülleri tek vitrin altında listelenmeye başladı.'
      },
      {
        id: 'admin-module',
        date: 'Mayıs 2026',
        title: 'Yönetim alanı modüler hale geliyor',
        text: 'Borç paneli admin alanına taşındı; diğer yönetim modülleri aşamalı olarak hazırlanıyor.'
      }
    ],

    events: [
      {
        id: 'community-night',
        day: '24',
        month: 'MAY',
        title: 'Topluluk sohbet gecesi',
        time: '21:00',
        location: 'Discord',
        status: 'Planlandı'
      },
      {
        id: 'mini-games',
        day: '26',
        month: 'MAY',
        title: 'Mini oyun deneme akşamı',
        time: '20:30',
        location: 'Tetris / GRID',
        status: 'Yakında'
      },
      {
        id: 'portal-review',
        day: '29',
        month: 'MAY',
        title: 'Portal geliştirme kontrolü',
        time: '22:00',
        location: 'metavis1on',
        status: 'Hazırlık'
      }
    ]
  };

  // Global olarak ekle
  window.MV_SITE = SITE;
})();
