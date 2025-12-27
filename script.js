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

    // Realistic Electron Configurations
    const electronConfigs = {
        iron: {
            symbol: 'Fe',
            number: 26,
            name: 'Iron',
            shells: [2, 8, 14, 2], // K, L, M, N shells
            color: '#f97316'
        },
        copper: {
            symbol: 'Cu',
            number: 29,
            name: 'Copper',
            shells: [2, 8, 18, 1],
            color: '#fbbf24'
        },
        gold: {
            symbol: 'Au',
            number: 79,
            name: 'Gold',
            shells: [2, 8, 18, 32, 18, 1], // 6 shells
            color: '#fcd34d'
        },
        titanium: {
            symbol: 'Ti',
            number: 22,
            name: 'Titanium',
            shells: [2, 8, 10, 2],
            color: '#a78bfa'
        },
        platinum: {
            symbol: 'Pt',
            number: 78,
            name: 'Platinum',
            shells: [2, 8, 18, 32, 17, 1], // 6 shells
            color: '#e2e8f0'
        },
        cobalt: {
            symbol: 'Co',
            number: 27,
            name: 'Cobalt',
            shells: [2, 8, 15, 2],
            color: '#60a5fa'
        }
    };

    const atomContainer = document.querySelector('.atom-container');
    const electronShellsContainer = document.querySelector('.electron-shells');
    const nucleusLabel = document.querySelector('.nucleus-label');
    const cubeFaces = document.querySelectorAll('.cube-face');
    const cubeContainer = document.querySelector('.element-cube-container');
    const modelTag = document.querySelector('.model-tag');

    // Cube positions for variety
    const cubePositions = [
        'pos-top-left',
        'pos-top-right',
        'pos-center-right',
        'pos-bottom-right',
        'pos-bottom-left',
        'pos-center-left'
    ];

    function createElectronShells(elementKey) {
        if (!electronShellsContainer) return;

        const config = electronConfigs[elementKey];

        // Fade out existing shells
        electronShellsContainer.style.opacity = '0';
        electronShellsContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';

        setTimeout(() => {
            electronShellsContainer.innerHTML = '';

            config.shells.forEach((electronCount, shellIndex) => {
                const shell = document.createElement('div');
                shell.className = `electron-shell shell-${shellIndex + 1}`;
                shell.style.borderColor = `${config.color}40`;

                // Add electrons to this shell (max 8 visible for performance)
                const visibleElectrons = Math.min(electronCount, 8);
                for (let i = 0; i < visibleElectrons; i++) {
                    const electron = document.createElement('div');
                    electron.className = 'shell-electron';
                    electron.style.background = config.color;
                    electron.style.boxShadow = `0 0 10px ${config.color}, 0 0 20px ${config.color}60`;

                    // Position electrons around the orbit
                    const angle = (i / visibleElectrons) * 360;
                    electron.style.transform = `rotate(${angle}deg) translateX(${(shellIndex + 1) * 25 + 15}px)`;

                    shell.appendChild(electron);
                }

                electronShellsContainer.appendChild(shell);
            });

            // Fade in new shells
            electronShellsContainer.style.opacity = '1';
            electronShellsContainer.style.transform = 'translate(-50%, -50%) scale(1)';

            // Update nucleus label
            if (nucleusLabel) {
                nucleusLabel.textContent = `${config.shells.length} shells · ${config.number} electrons`;
                nucleusLabel.style.color = config.color;
            }
        }, 300);
    }

    function updateCubePosition(index) {
        if (!cubeContainer) return;

        // Remove all position classes
        cubePositions.forEach(pos => cubeContainer.classList.remove(pos));

        // Add new position class
        cubeContainer.classList.add(cubePositions[index % cubePositions.length]);
    }

    function setActiveElement(elementKey, index = 0) {
        if (!atomContainer) return;

        // Flash effect on atom container
        atomContainer.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            atomContainer.style.filter = 'brightness(1)';
        }, 200);

        // Update atom colors
        atomContainer.setAttribute('data-element', elementKey);

        // Create electron shells with transition
        createElectronShells(elementKey);

        // Update cube position
        updateCubePosition(index);

        // Update active cube face
        cubeFaces.forEach(face => {
            if (face.getAttribute('data-element') === elementKey) {
                face.classList.add('active');
            } else {
                face.classList.remove('active');
            }
        });

        // Update model tag color
        if (modelTag) {
            const config = electronConfigs[elementKey];
            modelTag.style.borderColor = `${config.color}50`;
            modelTag.style.color = config.color;
            modelTag.style.background = `${config.color}15`;
        }
    }

    // Cube rotation syncs with element changes
    const cubeRotationOrder = ['iron', 'copper', 'gold', 'platinum', 'titanium', 'cobalt'];
    let currentElementIndex = 0;

    function cycleWithCube() {
        currentElementIndex = (currentElementIndex + 1) % cubeRotationOrder.length;
        setActiveElement(cubeRotationOrder[currentElementIndex], currentElementIndex);
    }

    // Click on cube face to change element
    cubeFaces.forEach(face => {
        face.addEventListener('click', () => {
            const elementKey = face.getAttribute('data-element');
            currentElementIndex = cubeRotationOrder.indexOf(elementKey);
            setActiveElement(elementKey, currentElementIndex);
        });
    });

    // Initialize and cycle every 4 seconds (synced with cube rotation)
    if (atomContainer) {
        // Add transition styles to electron shells container
        if (electronShellsContainer) {
            electronShellsContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
        if (atomContainer) {
            atomContainer.style.transition = 'filter 0.2s ease';
        }

        setActiveElement('iron', 0);
        setInterval(cycleWithCube, 4000);
    }

    // Performance Optimization: Pause animations when not visible
    const animatedSections = document.querySelectorAll('.hero, #vortex');

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const animatedElements = entry.target.querySelectorAll(
                '.atom-wrapper, .orbit, .electron, .electron-shell, ' +
                '.vortex, .vortex-ring, .vortex-core, .particle, .flow-line, .obstacle-glow'
            );

            if (entry.isIntersecting) {
                // Resume animations when visible
                animatedElements.forEach(el => {
                    el.style.animationPlayState = 'running';
                });
                entry.target.classList.remove('animations-paused');
            } else {
                // Pause animations when not visible
                animatedElements.forEach(el => {
                    el.style.animationPlayState = 'paused';
                });
                entry.target.classList.add('animations-paused');
            }
        });
    }, {
        root: null,
        rootMargin: '100px', // Start animations slightly before visible
        threshold: 0
    });

    animatedSections.forEach(section => {
        if (section) animationObserver.observe(section);
    });
});
