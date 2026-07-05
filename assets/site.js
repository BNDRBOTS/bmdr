/**
 * BMDR site runtime — deterministic, single-RAF, transform/opacity only.
 * One reveal observer, one demo loop. No polling, no per-element listeners.
 */
(function () {
    'use strict';

    /* ---------- Scroll reveal: one IntersectionObserver ---------- */
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = document.querySelectorAll('.reveal');

    if (reduced || !('IntersectionObserver' in window)) {
        items.forEach(function (el) { el.classList.add('in'); });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        items.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Live practice preview (mirrors the app's render loop) ---------- */
    var canvas = document.getElementById('demo-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var state = {
        hz: 0.4,            /* preview pace — calm end of the 0.2–3.0 range */
        mass: 26,
        color: '#00ffcc',
        time: 0,
        last: 0,
        path: 'lissajous',
        w: 0, h: 0, dpr: 1
    };

    function resize() {
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        var r = canvas.getBoundingClientRect();
        state.w = r.width;
        state.h = r.height;
        canvas.width = Math.round(r.width * state.dpr);
        canvas.height = Math.round(r.height * state.dpr);
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    window.addEventListener('resize', function () {
        resize();
        /* Viewport resizes reset the canvas backing store; repaint the
           static frame so reduced-motion users never see a blank space. */
        if (reduced) drawAnchor(state.w / 2, state.h / 2);
    });
    resize();

    if (reduced) {
        /* Static frame for reduced motion: anchor at rest, centered. */
        drawAnchor(state.w / 2, state.h / 2);
        return;
    }

    function drawAnchor(x, y) {
        ctx.clearRect(0, 0, state.w, state.h);
        var m = state.mass;
        var grad = ctx.createRadialGradient(x, y, 0, x, y, m * 2.2);
        grad.addColorStop(0, 'rgba(0, 255, 204, 0.55)');
        grad.addColorStop(1, 'rgba(0, 255, 204, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, m * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = state.color;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(x, y, m / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function tick(ts) {
        if (!state.last) state.last = ts;
        var dt = Math.min((ts - state.last) / 1000, 0.05);
        state.last = ts;
        state.time += dt * state.hz * Math.PI * 2;

        var pad = state.mass * 2.4;
        var cx = state.w / 2;
        var cy = state.h / 2;
        var ax = (state.w - pad * 2) / 2;
        var x, y;

        if (state.path === 'lissajous') {
            x = cx + Math.sin(state.time) * ax;
            y = cy + Math.sin(state.time * 2) * Math.min(state.h * 0.18, 70);
        } else {
            x = cx + Math.sin(state.time) * ax;
            y = cy;
        }

        drawAnchor(x, y);
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
