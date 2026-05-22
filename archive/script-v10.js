/**
 * metavis1on Resmi Topluluk Platformu - V3.0 Core Script
 * Gelişmiş Vanilla JS, Performans Odaklı, Animasyonlu ve Modüler
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. SİSTEM YAPILANDIRMASI (CONFIG)
    // =========================================
    const CONFIG = {
        discordLink: "https://discord.gg/TRNyQBfs",
        themeKey: "metavis1on_theme",
        scrollOffset: 120, // Aktif menü takibi için navbar yüksekliği + margin
        counterDuration: 2000 // Sayaç animasyonu milisaniye cinsinden
    };

    // Global durum yönetimi
    const State = {
        isScrolling: false,
        isMenuOpen: false,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    // =========================================
    // 2. TEMEL İŞLEVLENDİRME (BAĞLANTILAR & YIL)
    // =========================================
    const initBasics = () => {
        // Discord Bağlantılarını Otomatik Güncelleme
        const links = document.querySelectorAll('.discord-link');
        links.forEach(link => {
            link.href = CONFIG.discordLink;
            link.target = "_blank";
            link.rel = "noopener noreferrer"; // Güvenlik standardı
        });

        // Telif Hakkı Yılını Dinamik Güncelleme
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    };

    // =========================================
    // 3. TEMA YÖNETİM MOTORU (PRESET SYSTEM)
    // =========================================
    const initThemeSystem = () => {
        const themeToggle = document.getElementById('theme-toggle');
        const themeDropdown = document.getElementById('theme-dropdown');
        const themeOptions = document.querySelectorAll('.theme-option');
        const htmlDoc = document.documentElement;
        
        // 3.1 LocalStorage'dan Kayıtlı Temayı Yükle
        const savedTheme = localStorage.getItem(CONFIG.themeKey);
        if (savedTheme) {
            htmlDoc.setAttribute('data-theme', savedTheme);
        }

        if (!themeToggle || !themeDropdown) return;

        // 3.2 Dropdown Aç/Kapat Mantığı
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeToggle.parentElement.classList.toggle('active');
            
            // Erişilebilirlik
            const isExpanded = themeToggle.parentElement.classList.contains('active');
            themeToggle.setAttribute('aria-expanded', isExpanded);
        });

        // 3.3 Dışarı Tıklayınca Kapat
        document.addEventListener('click', (e) => {
            if (!themeToggle.parentElement.contains(e.target)) {
                themeToggle.parentElement.classList.remove('active');
                themeToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // 3.4 Tema Seçim İşlemi
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const newTheme = option.getAttribute('data-set-theme');
                htmlDoc.setAttribute('data-theme', newTheme);
                localStorage.setItem(CONFIG.themeKey, newTheme);
                
                // Menüyü kapat
                themeToggle.parentElement.classList.remove('active');
                
                // Seçili temayı görsel olarak vurgula (opsiyonel)
                themeOptions.forEach(opt => opt.style.fontWeight = '500');
                option.style.fontWeight = '700';
            });
        });
    };

    // =========================================
    // 4. MOBİL MENÜ MİMARİSİ
    // =========================================
    const initMobileMenu = () => {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileLinks = document.querySelectorAll('.mobile-link');
        
        if (!hamburger || !mobileMenu) return;

        const icon = hamburger.querySelector('i');

        const toggleMenu = () => {
            State.isMenuOpen = !State.isMenuOpen;
            
            // UI Güncelleme
            mobileMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', State.isMenuOpen);
            mobileMenu.setAttribute('aria-hidden', !State.isMenuOpen);
            
            // İkon ve Body Lock Değişimi
            if (State.isMenuOpen) {
                icon.classList.replace('ph-list', 'ph-x');
                document.body.style.overflow = 'hidden'; // Kaydırmayı engelle
            } else {
                icon.classList.replace('ph-x', 'ph-list');
                document.body.style.overflow = ''; // Kaydırmayı serbest bırak
            }
        };

        // Hamburger Tıklaması
        hamburger.addEventListener('click', toggleMenu);

        // Menü İçi Linklere Tıklayınca Menüyü Kapat ve İlgili Yere Git
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                if(State.isMenuOpen) toggleMenu();
            });
        });
    };

    // =========================================
    // 5. SCROLL ETKİLEŞİMLERİ (Spy, Progress, Navbar)
    // =========================================
    const initScrollFeatures = () => {
        const navbar = document.getElementById('navbar');
        const progressBar = document.getElementById('scroll-progress');
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links .nav-link');
        
        const onScroll = () => {
            const scrollY = window.scrollY;
            
            // 5.1 Navbar Arkaplan Bulanıklığı
            if (navbar) {
                if (scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }

            // 5.2 Yatay Scroll Progress Bar
            if (progressBar) {
                const winHeight = window.innerHeight;
                const docHeight = document.documentElement.scrollHeight;
                // Eğer sayfa scroll edilemiyorsa %0 yap
                const scrolled = docHeight - winHeight > 0 ? (scrollY / (docHeight - winHeight)) * 100 : 0;
                progressBar.style.width = `${scrolled}%`;
            }

            // 5.3 Active Section İzleme (Scroll Spy)
            sections.forEach(sec => {
                const top = sec.offsetTop - CONFIG.scrollOffset;
                const height = sec.offsetHeight;
                const id = sec.getAttribute('id');

                if (scrollY >= top && scrollY < top + height) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        // Sadece eşleşen linki aktif yap
                        if(link.getAttribute('href') === '#' + id) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        };

        // Performans dostu Throttle (requestAnimationFrame ile)
        window.addEventListener('scroll', () => {
            if (!State.isScrolling) {
                State.isScrolling = true;
                window.requestAnimationFrame(() => {
                    onScroll();
                    State.isScrolling = false;
                });
            }
        }, { passive: true });
        
        onScroll(); // Sayfa yüklendiğinde durumu kontrol et
    };

    // =========================================
    // 6. SCROLL REVEAL (İçeriklerin Kaydırıldıkça Gelmesi)
    // =========================================
    const initRevealAnimations = () => {
        const animatedElements = document.querySelectorAll('.scroll-animate');

        // Kullanıcı animasyon istemiyorsa (Erişilebilirlik) direkt göster
        if (State.prefersReducedMotion) {
            animatedElements.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -15% 0px', // Ekrana %15 girdiğinde tetikle
            threshold: 0.1
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // Performans: Sadece 1 kez tetiklensin
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => revealObserver.observe(el));
    };

    // =========================================
    // 7. DİNAMİK SAYAÇ ANİMASYONU (Gelişmiş)
    // =========================================
    const initCounters = () => {
        const counters = document.querySelectorAll('.counter');
        if (counters.length === 0) return;

        // Sayma fonksiyonu (Easing mantığı eklendi)
        const runCounter = (counter) => {
            const target = +counter.getAttribute('data-target');
            const duration = CONFIG.counterDuration;
            const frameRate = 1000 / 60; // ~60fps
            const totalFrames = Math.round(duration / frameRate);
            let frame = 0;

            const countInterval = setInterval(() => {
                frame++;
                // easeOutQuad formulü: 1 - (1 - t) * (1 - t)
                const progress = frame / totalFrames;
                const easeOut = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                
                const current = Math.round(target * easeOut);
                
                counter.innerText = current;

                if (frame >= totalFrames) {
                    counter.innerText = target; // Küsuratları temizle tam hedefe oturt
                    clearInterval(countInterval);
                }
            }, frameRate);
        };

        // Sayaçları ekrana girdiklerinde başlat
        const observerOptions = {
            threshold: 0.5 // Sayacın yarısı göründüğünde başla
        };

        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    observer.unobserve(entry.target); // Bir kez say
                }
            });
        }, observerOptions);

        counters.forEach(counter => {
            if (State.prefersReducedMotion) {
                // Animasyon istemiyorsa direkt hedefi yaz
                counter.innerText = counter.getAttribute('data-target');
            } else {
                counterObserver.observe(counter);
            }
        });
    };

    // =========================================
    // 8. 3D MOUSE PARALLAX & GLOW EFEKTİ (Spotlight)
    // =========================================
    const initInteractiveCards = () => {
        if (State.prefersReducedMotion) return; // Animasyon istemeyenleri yorma

        const cards = document.querySelectorAll('.interactive-parallax');

        cards.forEach(card => {
            card.addEventListener('mousemove', e => {
                // Kartın ekrandaki pozisyonunu hesapla
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; // Kart içindeki X konumu
                const y = e.clientY - rect.top;  // Kart içindeki Y konumu
                
                // Spotlight (Glow) efekti için CSS değişkenlerini besle
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
                
                // 3D Tilt (Eğim) Efekti Hesaplaması
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Max dönüş açısı (derece)
                const maxRotate = 4; 
                const rotateX = ((y - centerY) / centerY) * -maxRotate; 
                const rotateY = ((x - centerX) / centerX) * maxRotate;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            // Fare çıkınca kartı orjinal pozisyonuna yumuşakça döndür
            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        });
    };

    // =========================================
    // 9. FAQ ACCORDION MANTIĞI
    // =========================================
    const initFAQ = () => {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const btn = item.querySelector('.faq-question');
            if(!btn) return;

            btn.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Tekil açık kalma mantığı (Birisi açılınca diğerleri kapansın)
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                });

                // Tıklananı aç (eğer zaten açık değilse)
                if (!isActive) {
                    item.classList.add('active');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    };

    // =========================================
    // 10. ARKA PLAN PARTİKÜL SİSTEMİ (Bonus Görsellik)
    // =========================================
    const initParticles = () => {
        if (State.prefersReducedMotion) return;

        const container = document.getElementById('particles-container');
        if (!container) return;

        const particleCount = 20; // Ekranda süzülen hafif noktalar
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(container);
        }
    };

    const createParticle = (container) => {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Rastgele boyut (2px - 6px)
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Başlangıç konumu
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        
        container.appendChild(particle);

        // Animasyon döngüsü
        animateParticle(particle);
    };

    const animateParticle = (particle) => {
        // Hedef konum
        const newX = Math.random() * 100;
        const newY = Math.random() * 100;
        // Animasyon süresi (10s - 25s arası yavaş akış)
        const duration = Math.random() * 15000 + 10000;

        particle.animate([
            { transform: 'translate(0, 0)', opacity: 0 },
            { opacity: Math.random() * 0.5 + 0.1, offset: 0.5 }, // Yarı şeffaf belirme
            { transform: `translate(${newX - 50}vw, ${newY - 50}vh)`, opacity: 0 }
        ], {
            duration: duration,
            easing: 'ease-in-out',
            fill: 'forwards'
        }).onfinish = () => {
            // Bitince yeniden başlat (Sonsuz döngü)
            particle.style.left = `${Math.random() * 100}vw`;
            particle.style.top = `${Math.random() * 100}vh`;
            animateParticle(particle);
        };
    };

    // =========================================
    // SİSTEM BAŞLATMA (BOOTSTRAP)
    // =========================================
    const boot = () => {
        initBasics();
        initThemeSystem();
        initMobileMenu();
        initScrollFeatures();
        initRevealAnimations();
        initCounters();
        initInteractiveCards();
        initFAQ();
        initParticles();
    };

    // Ateşle
    boot();
});