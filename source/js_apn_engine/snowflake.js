
(() => {
    const INITIAL_FADE_MS = 5000; // page-load fade
    const TOGGLE_FADE_MS  = 1000; // 's' toggle fade
    const FLAKES = 150;

    let canvas, ctx, rafId;
    let flakes = [];

    let snowOn = false;           // target state
    let alpha = 1;                // start visible (then fade out)
    let lastTime = 0;
    let fadeMs = INITIAL_FADE_MS; // current fade duration

    // 'f' toggles draw style
    let drawMode = "crystal"; // "circle" | "crystal"

    function createCanvas() {
        if (canvas) return;

        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");

        Object.assign(canvas.style, {
            position: "fixed",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 9999,
        });

        document.body.appendChild(canvas);

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // flakes have both circle + crystal params; mode just changes drawing
        flakes = Array.from({ length: FLAKES }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            // circle-ish size (also used as crystal size)
            size: Math.random() * 3 + 2,                // 2..5
            fall: Math.random() * 1.1 + 0.4,
            driftAmp: Math.random() * 0.7 + 0.2,
            driftPhase: Math.random() * Math.PI * 2,
            // crystal rotation
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() * 2 - 1) * 0.0025,     // rad/ms
        }));
    }

    function destroyCanvas() {
        if (!canvas) return;
        cancelAnimationFrame(rafId);
        rafId = null;
        canvas.remove();
        canvas = ctx = null;
        flakes = [];
    }

    function drawCircle(x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3 crossed lines (6 arms) + tiny center
    function drawCrystal(x, y, size, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.lineWidth = Math.max(1, size * 0.25);
        ctx.lineCap = "round";

        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            ctx.rotate(Math.PI / 3); // 60°
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.7, size * 0.18), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function tick(now) {
        if (!canvas) return;

        const dt = now - lastTime;
        lastTime = now;

        const delta = dt / fadeMs;
        alpha += snowOn ? delta : -delta;
        alpha = Math.max(0, Math.min(1, alpha));

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;

        // common styles
        ctx.fillStyle = "white";
        ctx.strokeStyle = "white";

        for (const f of flakes) {
            // motion
            f.y += f.fall;
            f.x += Math.sin(f.driftPhase) * f.driftAmp;
            f.driftPhase += 0.01;
            f.angle += f.spin * dt;

            // wrap
            if (f.y > canvas.height + 10) {
                f.y = -10;
                f.x = Math.random() * canvas.width;
            }
            if (f.x < -20) f.x = canvas.width + 20;
            if (f.x > canvas.width + 20) f.x = -20;

            // draw
            if (drawMode === "circle") {
                drawCircle(f.x, f.y, f.size);
            } else {
                drawCrystal(f.x, f.y, f.size, f.angle);
            }
        }

        if (alpha === 0 && !snowOn) {
            destroyCanvas();
            return;
        }

        rafId = requestAnimationFrame(tick);
    }

    function ensureRunning() {
        if (!canvas) {
            createCanvas();
            lastTime = performance.now();
            rafId = requestAnimationFrame(tick);
        }
    }

    // Key controls:
    // - 's' toggles snow on/off (1s fade)
    // - 'f' toggles draw mode circle <-> crystal (no fade change)
    window.addEventListener(
        "keydown",
        (e) => {
            if (e.repeat) return;

            if (e.key === "s" || e.key === "S") {
                snowOn = !snowOn;
                fadeMs = TOGGLE_FADE_MS;
                ensureRunning();
                return;
            }

            if (e.key === "f" || e.key === "F") {
                drawMode = (drawMode === "circle") ? "crystal" : "circle";
                ensureRunning(); // if canvas is gone, recreate so mode change is visible when on
                return;
            }
        },
        true
    );

    // Initial behaviour: visible -> slow fade out
    fadeMs = INITIAL_FADE_MS;
    ensureRunning();
})();
