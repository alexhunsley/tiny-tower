(() => {
    const INITIAL_FADE_MS = 5000; // page-load fade
    const TOGGLE_FADE_MS  = 1000; // 's' toggle fade
    const FLAKES = 150;

    let canvas, ctx, rafId;
    let flakes = [];

    let snowOn = false;     // target state
    let alpha = 1;          // start visible
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

        flakes = Array.from({ length: FLAKES }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            s: Math.random() * 1 + 0.5,
            d: Math.random() * Math.PI * 2,
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

    function tick(now) {
        if (!canvas) return;

        const dt = now - lastTime;
        lastTime = now;

        const delta = dt / fadeMs;
        alpha += snowOn ? delta : -delta;
        alpha = Math.max(0, Math.min(1, alpha));

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "white";

        for (const f of flakes) {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();

            f.y += f.s;
            f.x += Math.sin(f.d) * 0.3;
            f.d += 0.01;

            if (f.y > canvas.height) {
                f.y = -5;
                f.x = Math.random() * canvas.width;
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

    // ---- keyboard toggle ----
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

    // ---- initial behaviour: visible → slow fade out ----
    fadeMs = INITIAL_FADE_MS;
    ensureRunning();
})();
