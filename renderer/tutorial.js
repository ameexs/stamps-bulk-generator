/**
 * STAMPS Bulk Generator - First-time Onboarding Tutorial
 * Fully self-contained. Does NOT touch the generation pipeline.
 * - Auto-opens once for new users (localStorage flag).
 * - Re-openable anytime via the header "Help" button (#tutorial-btn).
 */
(function () {
    'use strict';

    var SEEN_KEY = 'stamps_tutorial_v1_seen';

    // Icon set (inline SVG) used on each slide's visual band.
    var ICONS = {
        wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M2 16h20"/><path d="M8 20h8"/><circle cx="12" cy="8" r="2.2"/></svg>',
        toggle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="8" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polygon points="10 12 15 15 10 18" fill="currentColor" stroke="none"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };

    // Slide deck. Highlight = element id to pulse when tour ends.
    var SLIDES = [
        {
            icon: ICONS.wave, badge: 'Getting started',
            label: 'Welcome',
            title: 'Welcome to STAMPS Bulk Generator',
            text: 'Turn a filled-in Excel file into a fully <strong>LHDN-compliant e-Duti Setem (MyTax)</strong> XML — ready to upload. This quick tour takes about 30 seconds.'
        },
        {
            icon: ICONS.toggle, badge: 'Step 1 of 4',
            label: 'Choose your type',
            title: 'Pick your Application Type',
            text: 'Top-right, choose <strong>Sekuriti (43)</strong> or <strong>Penyeteman Am (44)</strong>. The template and the validation rules automatically adapt to the type you select.',
            highlight: 'app-type-select'
        },
        {
            icon: ICONS.download, badge: 'Step 1 of 4',
            label: 'Get the template',
            title: 'Download the Excel template',
            text: 'Click <strong>Download Template</strong> to get the correct column format for your chosen type. Fill in your records in Excel — one row per instrument.',
            highlight: 'download-template-btn'
        },
        {
            icon: ICONS.upload, badge: 'Step 1 of 4',
            label: 'Upload',
            title: 'Select your file & attachments',
            text: 'Upload your filled Excel/CSV. If any rows reference a PDF/image, select those files too — the app shows you <strong>matched</strong> vs <strong>missing</strong> at a glance.',
            highlight: 'select-excel-btn'
        },
        {
            icon: ICONS.shield, badge: 'Steps 2 & 3',
            label: 'Preview & validate',
            title: 'Check everything before you submit',
            text: 'Preview your data, then run <strong>validation</strong>. Missing or invalid fields are flagged <strong>row-by-row</strong> — so LHDN never bounces your submission.'
        },
        {
            icon: ICONS.play, badge: 'Step 4 of 4',
            label: 'Generate',
            title: 'Generate your XML',
            text: 'Produce your STAMPS XML in one click. Output over <strong>30 MB auto-splits</strong> into batches. Upload the file(s) straight into MyTax. Done!'
        },
        {
            icon: ICONS.check, badge: 'All set',
            label: "You're ready",
            title: "That's it — you're ready to go",
            text: 'Replay this tour anytime with the <strong>Help</strong> button in the top bar. Need a hand? WhatsApp <strong>+60&nbsp;11-2324&nbsp;0319</strong> or email ameershafiq010@gmail.com.'
        }
    ];

    var current = 0;
    var overlay = null;

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'tut-overlay';
        overlay.innerHTML =
            '<div class="tut-card" role="dialog" aria-modal="true" aria-label="Tutorial">' +
                '<div class="tut-visual">' +
                    '<span class="tut-badge" id="tut-badge"></span>' +
                    '<button class="tut-skip" id="tut-skip" type="button">Skip tour</button>' +
                    '<div id="tut-icon"></div>' +
                '</div>' +
                '<div class="tut-body">' +
                    '<div class="tut-step-label" id="tut-label"></div>' +
                    '<div class="tut-title" id="tut-title"></div>' +
                    '<div class="tut-text" id="tut-text"></div>' +
                '</div>' +
                '<div class="tut-dots" id="tut-dots"></div>' +
                '<div class="tut-nav">' +
                    '<button class="tut-btn tut-btn-ghost" id="tut-prev" type="button">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</button>' +
                    '<button class="tut-btn tut-btn-primary" id="tut-next" type="button">Next' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        // Dots
        var dots = overlay.querySelector('#tut-dots');
        for (var i = 0; i < SLIDES.length; i++) {
            var d = document.createElement('span');
            d.className = 'tut-dot';
            d.setAttribute('data-i', i);
            dots.appendChild(d);
        }

        overlay.querySelector('#tut-skip').addEventListener('click', close);
        overlay.querySelector('#tut-prev').addEventListener('click', function () { go(current - 1); });
        overlay.querySelector('#tut-next').addEventListener('click', function () {
            if (current === SLIDES.length - 1) { close(true); }
            else { go(current + 1); }
        });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (!overlay || !overlay.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') go(current + 1);
        else if (e.key === 'ArrowLeft') go(current - 1);
    }

    function render() {
        var s = SLIDES[current];
        overlay.querySelector('#tut-icon').innerHTML = s.icon;
        overlay.querySelector('#tut-badge').textContent = s.badge;
        overlay.querySelector('#tut-label').textContent = s.label;
        overlay.querySelector('#tut-title').textContent = s.title;
        overlay.querySelector('#tut-text').innerHTML = s.text;

        var dots = overlay.querySelectorAll('.tut-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === current);
        }

        overlay.querySelector('#tut-prev').disabled = current === 0;
        overlay.querySelector('#tut-next').textContent = current === SLIDES.length - 1 ? 'Get started' : 'Next';
    }

    function go(i) {
        if (i < 0 || i > SLIDES.length - 1) return;
        current = i;
        render();
    }

    function open(startAt) {
        if (!overlay) build();
        current = startAt || 0;
        render();
        overlay.classList.add('open');
    }

    function close(completed) {
        if (!overlay) return;
        overlay.classList.remove('open');
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
        if (completed) spotlightStart();
    }

    // After the tour, briefly pulse the controls a first-timer should touch first.
    function spotlightStart() {
        ['app-type-select', 'download-template-btn'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.add('tut-pulse');
            setTimeout(function () { el.classList.remove('tut-pulse'); }, 4500);
        });
    }

    function initButton() {
        ['tutorial-btn', 'tutorial-btn-footer'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', function () { open(0); });
        });
    }

    function maybeAutoOpen() {
        var seen = null;
        try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { /* ignore */ }
        if (!seen) { setTimeout(function () { open(0); }, 450); }
    }

    function start() {
        initButton();
        maybeAutoOpen();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
