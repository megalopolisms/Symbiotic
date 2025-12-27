// Symbiotic Dynamics - Interactive Scripts

document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navLinks.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    });

    // Navbar background on scroll
    const nav = document.querySelector('.nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.style.background = 'rgba(10, 10, 15, 0.95)';
        } else {
            nav.style.background = 'rgba(10, 10, 15, 0.8)';
        }

        lastScroll = currentScroll;
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.service-card, .stat, .capability-group').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add visible class styles
    const style = document.createElement('style');
    style.textContent = `
        .service-card.visible,
        .stat.visible,
        .capability-group.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        .nav-links.active {
            display: flex;
            position: absolute;
            top: 72px;
            left: 0;
            right: 0;
            flex-direction: column;
            background: rgba(10, 10, 15, 0.98);
            padding: 24px;
            gap: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-menu.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .mobile-menu.active span:nth-child(2) {
            opacity: 0;
        }

        .mobile-menu.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }
    `;
    document.head.appendChild(style);

    // Form submission handling
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // Simulate form submission (replace with actual endpoint)
            setTimeout(() => {
                submitBtn.textContent = 'Sent!';
                submitBtn.style.background = '#10b981';

                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                    form.reset();
                }, 2000);
            }, 1000);
        });
    }

    // Parallax effect on hero visual
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual && window.innerWidth > 768) {
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            heroVisual.style.transform = `translateY(-50%) translate(${x}px, ${y}px)`;
        });
    }

    // Element Cycling for Atom Animation
    const elements = [
        { symbol: 'Fe', name: 'Iron', number: 26, key: 'iron' },
        { symbol: 'Cu', name: 'Copper', number: 29, key: 'copper' },
        { symbol: 'Au', name: 'Gold', number: 79, key: 'gold' },
        { symbol: 'Ti', name: 'Titanium', number: 22, key: 'titanium' },
        { symbol: 'Pt', name: 'Platinum', number: 78, key: 'platinum' },
        { symbol: 'Co', name: 'Cobalt', number: 27, key: 'cobalt' }
    ];

    let currentElementIndex = 0;
    const atomContainer = document.querySelector('.atom-container');
    const elementSymbol = document.querySelector('.element-symbol');
    const elementName = document.querySelector('.element-name');
    const elementNumber = document.querySelector('.element-number');
    const elementLegend = document.querySelector('.element-legend');

    function cycleElement() {
        if (!atomContainer || !elementSymbol) return;

        // Fade out
        elementLegend.style.opacity = '0';
        elementLegend.style.transform = 'translateX(-10px)';

        setTimeout(() => {
            // Update to next element
            currentElementIndex = (currentElementIndex + 1) % elements.length;
            const element = elements[currentElementIndex];

            atomContainer.setAttribute('data-element', element.key);
            elementSymbol.textContent = element.symbol;
            elementName.textContent = element.name;
            elementNumber.textContent = element.number;

            // Fade in
            elementLegend.style.opacity = '1';
            elementLegend.style.transform = 'translateX(0)';
        }, 300);
    }

    // Cycle every 5 seconds
    if (atomContainer) {
        setInterval(cycleElement, 5000);
    }
});
