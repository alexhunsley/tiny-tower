(() => {
    console.log("SNOWFLAKE loaded");
    const DURATION = 5000; // ms
    const FLAKES = 150;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    Object.assign(canvas.style, {
        position: "fixed",
        top: 0,
        left: 0,
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

    const flakes = Array.from({length: FLAKES}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        s: Math.random() * 1 + 0.5,
        d: Math.random() * Math.PI * 2,
    }));

    const start = performance.now();

    function draw(now) {
        const elapsed = now - start;
        const fade = Math.max(1 - elapsed / DURATION, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = fade;
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

        if (fade > 0) {
            requestAnimationFrame(draw);
        } else {
            canvas.remove();
            window.removeEventListener("resize", resize);
        }
    }

    requestAnimationFrame(draw);
})();
