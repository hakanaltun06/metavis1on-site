// =========================================
// 1. YAPILANDIRMA (CONFIG)
// =========================================
const DISCORD_INVITE_URL = "https://discord.gg/metavis1on-ornek"; // Burayı kendi linkinle değiştir

// =========================================
// 2. DISCORD BUTONLARINI GÜNCELLEME
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const discordLinks = document.querySelectorAll('.discord-link');
    discordLinks.forEach(link => {
        link.href = DISCORD_INVITE_URL;
        link.target = "_blank"; // Yeni sekmede açılması için
        link.rel = "noopener noreferrer"; // Güvenlik standardı
    });

    // =========================================
    // 3. MOBİL MENÜ MANTIĞI
    // =========================================
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const hamburgerIcon = hamburger.querySelector('i');
    
    let isMenuOpen = false;

    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
        mobileMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isMenuOpen);
        
        // İkonu değiştir (Hamburger <-> Çarpı)
        if (isMenuOpen) {
            hamburgerIcon.classList.remove('ph-list');
            hamburgerIcon.classList.add('ph-x');
            document.body.style.overflow = 'hidden'; // Menü açıkken scroll'u kilitle
        } else {
            hamburgerIcon.classList.remove('ph-x');
            hamburgerIcon.classList.add('ph-list');
            document.body.style.overflow = '';
        }
    };

    hamburger.addEventListener('click', toggleMenu);

    // Linke tıklandığında menüyü kapat
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMenuOpen) toggleMenu();
        });
    });

    // =========================================
    // 4. NAVBAR SCROLL EFEKTİ
    // =========================================
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // =========================================
    // 5. SCROLL ANİMASYONLARI (INTERSECTION OBSERVER)
    // =========================================
    // Kullanıcının "Reduced Motion" tercihi var mı kontrol et
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15 // Elementin %15'i göründüğünde tetikle
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Bir kere tetiklendikten sonra izlemeyi bırak (performans için)
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.scroll-animate');
        animatedElements.forEach(el => observer.observe(el));
    } else {
        // Reduced motion aktifse hepsini baştan görünür yap
        const animatedElements = document.querySelectorAll('.scroll-animate');
        animatedElements.forEach(el => el.classList.add('is-visible'));
    }
});