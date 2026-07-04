/**
 * STAMPS Bulk Generator - Landing Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth Scroll for Navigation Links
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
                navToggle.classList.remove('active');
            }
        });
    });

    // Navbar Background on Scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Scrollspy — highlight the nav link for the section currently in view
    const navAnchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const spySections = navAnchors
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    if (spySections.length) {
        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = '#' + entry.target.id;
                    navAnchors.forEach(a => {
                        a.classList.toggle('active', a.getAttribute('href') === id && !a.classList.contains('btn'));
                    });
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        spySections.forEach(sec => spyObserver.observe(sec));
    }

    // Animate Elements on Scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .problem-card, .pricing-card, .step-item, .contact-card').forEach(el => {
        el.classList.add('animate-target');
        observer.observe(el);
    });

    // Contact Form Handler — submits to Web3Forms, which emails each enquiry.
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('https://formsubmit.co/ajax/ameershafiq010@gmail.com', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new FormData(contactForm)
                });
                const result = await response.json();

                // FormSubmit returns success as the string "true"
                if (result.success === true || result.success === 'true') {
                    // Real delivery confirmed by Web3Forms
                    submitBtn.textContent = 'Message Sent!';
                    submitBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                    contactForm.reset();
                } else {
                    throw new Error(result.message || 'Submission rejected');
                }
            } catch (err) {
                // Honest failure state — do NOT claim it was sent
                console.error('Contact form error:', err);
                submitBtn.textContent = 'Failed — please WhatsApp us';
                submitBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            } finally {
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.background = '';
                }, 4000);
            }
        });
    }

    // Add CSS for animations and mobile menu
    const style = document.createElement('style');
    style.textContent = `
        /* Animation styles */
        .animate-target {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Scrolled navbar */
        .nav.scrolled {
            background: rgba(10, 10, 15, 0.95);
        }
        
        /* Mobile menu active state */
        @media (max-width: 768px) {
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
                border-bottom: 1px solid var(--border);
            }
            
            .nav-toggle.active span:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .nav-toggle.active span:nth-child(2) {
                opacity: 0;
            }
            
            .nav-toggle.active span:nth-child(3) {
                transform: rotate(-45deg) translate(6px, -6px);
            }
        }
        
        /* Stagger animation delays */
        .feature-card:nth-child(1) { transition-delay: 0.1s; }
        .feature-card:nth-child(2) { transition-delay: 0.2s; }
        .feature-card:nth-child(3) { transition-delay: 0.3s; }
        .feature-card:nth-child(4) { transition-delay: 0.4s; }
        .feature-card:nth-child(5) { transition-delay: 0.5s; }
        .feature-card:nth-child(6) { transition-delay: 0.6s; }
        
        .pricing-card:nth-child(1) { transition-delay: 0.1s; }
        .pricing-card:nth-child(2) { transition-delay: 0.2s; }
        .pricing-card:nth-child(3) { transition-delay: 0.3s; }
        
        .step-item:nth-child(1) { transition-delay: 0.1s; }
        .step-item:nth-child(2) { transition-delay: 0.3s; }
        .step-item:nth-child(3) { transition-delay: 0.5s; }
    `;
    document.head.appendChild(style);

    // Animate hero elements on load
    setTimeout(() => {
        document.querySelector('.hero-text')?.classList.add('animate-in');
    }, 100);

    setTimeout(() => {
        document.querySelector('.hero-visual')?.classList.add('animate-in');
    }, 300);

    // Add hover effect to app preview
    const appWindow = document.querySelector('.app-window');
    if (appWindow) {
        // Animate preview steps
        const steps = appWindow.querySelectorAll('.preview-step');
        let currentStep = 0;

        setInterval(() => {
            steps.forEach(s => s.classList.remove('active'));
            steps[currentStep].classList.add('active');
            currentStep = (currentStep + 1) % steps.length;
        }, 2000);
    }

    console.log('STAMPS Landing Page initialized');
});
