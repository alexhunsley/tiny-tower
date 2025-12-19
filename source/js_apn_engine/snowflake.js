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

        // "crystals": each flake has size, drift, angle, spin
        flakes = Array.from({ length: FLAKES }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 2,                // 2..5 px-ish
            fall: Math.random() * 1.1 + 0.4,            // speed
            driftAmp: Math.random() * 0.7 + 0.2,
            driftPhase: Math.random() * Math.PI * 2,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() * 2 - 1) * 0.0025,     // rad/ms (subtle)
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

    // Draw a little "crystal": 3 crossed lines (6 arms) + tiny center
    function drawCrystal(x, y, size, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // line thickness scales a bit with size
        ctx.lineWidth = Math.max(1, size * 0.25);
        ctx.lineCap = "round";

        // arms
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            ctx.rotate(Math.PI / 3); // 60°
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
        }
        ctx.stroke();

        // tiny center dot
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

        // crystals look better stroked + filled
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";

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

            drawCrystal(f.x, f.y, f.size, f.angle);
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

    // 's' toggles, always works mid-fade
    window.addEventListener(
        "keydown",
        (e) => {
            if (e.key !== "s" && e.key !== "S") return;
            if (e.repeat) return;

            snowOn = !snowOn;
            fadeMs = TOGGLE_FADE_MS; // faster fade for user toggle
            ensureRunning();
        },
        true
    );

    // Initial behaviour: visible -> slow fade out
    fadeMs = INITIAL_FADE_MS;
    ensureRunning();
})();
