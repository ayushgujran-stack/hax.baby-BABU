"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type Props = {
    label?: boolean;
    labelText?: string;
    labelColor?: string;
    labelFont?: React.CSSProperties;
    headColor?: string;
    trailColor?: string;
    size?: number;
    trailLength?: number;
    trailThickness?: number;
    style?: React.CSSProperties;
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "48px",
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
} as React.CSSProperties;

const FOLLOW_TAU = 0.01;
const SNAPPINESS = 10;
const BORDER_WIDTH = 2;
const HOVER_SCALE = 2.5;

const PINK_SPARKLES = [
    "#FF719A", // Crayon Pink
    "#FF4081", // Vivid Hot Pink
    "#FF85A2", // Rosebud Pink
    "#FF5B55", // Crayon Coral Pink
    "#F472B6", // Soft Blossom Pink
    "#FFB1C2", // Pastel Pink
];

const DEFAULTS = {
    label: false,
    labelText: "HOVER ME",
    labelColor: "#FFFFFF",
    headColor: "#FF719A",
    trailColor: "#FF719A",
    size: 15, // Compact size ("a little smaller, not more")
    trailLength: 10,
    trailThickness: 12,
};

function parseRgb(str: string): { r: number; g: number; b: number } | null {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
        return {
            r: parseInt(m[1], 10),
            g: parseInt(m[2], 10),
            b: parseInt(m[3], 10),
        };
    }
    return null;
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
    h = (h % 360) / 360;
    if (h < 0) h += 1;
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

// Compute high-contrast complementary color from background RGB
function getComplementaryColor(rgb: { r: number; g: number; b: number }) {
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Near-grayscale or low saturation background (e.g. ink black or paper cream)
    if (s < 0.18) {
        // Dark background (e.g. #292521 ink black) -> Sunshine Yellow complement
        if (l < 0.35) {
            return { r: 255, g: 216, b: 77 }; // Sunshine Yellow
        }
        // Light paper cream background -> Rich Crayon Pink / Primary complement
        return { r: 255, g: 91, b: 85 }; // Crayon Coral Pink #FF5B55
    }

    // Chromatic background: Rotate hue by 180° for true complementary color
    const compHue = (h + 180) % 360;
    const compSat = Math.max(0.75, s);
    const compLight = l > 0.55 ? 0.45 : 0.62;

    return hslToRgb(compHue, compSat, compLight);
}

function getElementBgColor(x: number, y: number): { r: number; g: number; b: number } {
    if (typeof document === "undefined") return { r: 255, g: 248, b: 232 };
    let el = document.elementFromPoint(x, y);
    let depth = 0;
    while (el && el !== document.documentElement && depth < 5) {
        depth++;
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            const parsed = parseRgb(bg);
            if (parsed) return parsed;
        }
        el = el.parentElement;
    }
    return { r: 255, g: 248, b: 232 }; // default paper cream
}

// Draw a crisp 4-pointed diamond sparkle
function drawSparkle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rotation: number,
    color: string,
    alpha: number
) {
    if (radius <= 0.2 || alpha <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.quadraticCurveTo(0, 0, 0, radius);
    ctx.quadraticCurveTo(0, 0, -radius, 0);
    ctx.quadraticCurveTo(0, 0, 0, -radius);
    ctx.closePath();
    ctx.fill();

    // Center twinkle gleam
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.5, radius * 0.24), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

const HIDE_SELECTOR =
    '[aria-label~="trail{hide}"],[data-framer-name~="trail{hide}"]';
const LINK_SELECTOR =
    '[aria-label~="trail{link}"],[data-framer-name~="trail{link}"]';
const RING_SELECTOR = 'a,button,[role="button"]';

export default function DotCursor(props: Props) {
    const {
        size = DEFAULTS.size,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        style,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);

    const live = useRef({ size });
    live.current = { size };
    const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

    useEffect(() => {
        const canvas = canvasRef.current;
        const host = frameRef.current;
        if (!canvas || !host) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 1;
        let h = 1;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = Math.max(1, host.clientWidth);
            h = Math.max(1, host.clientHeight);
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const localize = (clientX: number, clientY: number) => {
            const rect = host.getBoundingClientRect();
            const sx = rect.width > 0 ? host.clientWidth / rect.width : 1;
            const sy = rect.height > 0 ? host.clientHeight / rect.height : 1;
            return {
                x: (clientX - rect.left) * sx,
                y: (clientY - rect.top) * sy,
                over:
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom,
            };
        };

        const previousCursor = document.documentElement.style.cursor;
        let cursorHidden = false;
        const hideNativeCursor = (hide: boolean) => {
            if (hide === cursorHidden) return;
            cursorHidden = hide;
            document.documentElement.style.cursor = hide
                ? "none"
                : previousCursor;
        };

        let ballX = 0;
        let ballY = 0;
        let prevBallX = 0;
        let prevBallY = 0;
        let targetX = 0;
        let targetY = 0;

        let radius = live.current.size / 2;
        let fillOpacity = 1;
        let strokeOpacity = 0;
        let lineOpacity = 0;
        let lineWidth = 0;
        let lineTargetWidth = 0;

        // Complementary color state with smooth interpolation
        let currR = 255;
        let currG = 113;
        let currB = 154;
        let targetR = 255;
        let targetG = 113;
        let targetB = 154;

        type Sparkle = {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            rotation: number;
            rotSpeed: number;
            color: string;
            age: number;
            maxLife: number;
        };
        let sparkles: Sparkle[] = [];

        let hitDirty = true;
        let overHide = false;
        let overRing = false;
        let linkEl: Element | null = null;

        let seeded = false;
        let inside = false;
        let hitX = 0;
        let hitY = 0;
        let lastHitSample = 0;

        const seedAt = (x: number, y: number) => {
            seeded = true;
            targetX = x;
            targetY = y;
            ballX = x;
            ballY = y;
            prevBallX = x;
            prevBallY = y;
            canvas.style.opacity = "1";
            sparkles = [];
        };

        const exitTo = (x: number, y: number) => {
            ballX = x;
            ballY = y;
            targetX = x;
            targetY = y;
            inside = false;
            hitDirty = false;
            hideNativeCursor(false);
        };

        const onMove = (e: PointerEvent) => {
            const pt = localize(e.clientX, e.clientY);
            if (!pt.over) {
                if (inside) exitTo(pt.x, pt.y);
                return;
            }
            if (!seeded || !inside) seedAt(pt.x, pt.y);
            targetX = pt.x;
            targetY = pt.y;
            hitX = e.clientX;
            hitY = e.clientY;
            inside = true;
            hitDirty = true;
            hideNativeCursor(true);
        };

        const onWindowLeave = () => {
            if (inside) exitTo(targetX, targetY);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onWindowLeave);

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize);
            ro.observe(host);
        }
        window.addEventListener("resize", resize);

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            try {
                const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
                last = now;
                const p = live.current;

                ctx.clearRect(0, 0, w, h);

            if (!seeded) {
                raf = requestAnimationFrame(frame);
                return;
            }

            const followEase = 1 - Math.exp(-dt / FOLLOW_TAU);
            prevBallX = ballX;
            prevBallY = ballY;
            ballX += (targetX - ballX) * followEase;
            ballY += (targetY - ballY) * followEase;

            // Background inspection & complementary color update
            // Throttle elementFromPoint sampling to at most every 100ms
            if (hitDirty && inside && now - lastHitSample > 100) {
                lastHitSample = now;
                const el = document.elementFromPoint(hitX, hitY);
                overHide = !!el?.closest(HIDE_SELECTOR);
                linkEl = el?.closest(LINK_SELECTOR) ?? null;
                overRing = !!el?.closest(RING_SELECTOR);

                // Sample background and compute complementary color
                const bgRgb = getElementBgColor(hitX, hitY);
                const comp = getComplementaryColor(bgRgb);
                targetR = comp.r;
                targetG = comp.g;
                targetB = comp.b;

                hitDirty = false;
            }

            // Smoothly lerp towards the complementary color
            const colorEase = 1 - Math.exp(-dt * 14);
            currR += (targetR - currR) * colorEase;
            currG += (targetG - currG) * colorEase;
            currB += (targetB - currB) * colorEase;

            const activeColorRgb = `rgb(${Math.round(currR)}, ${Math.round(currG)}, ${Math.round(currB)})`;

            if (overHide) {
                sparkles = [];
                raf = requestAnimationFrame(frame);
                return;
            }

            // Spawn pink sparkle trail behind cursor movement
            const dist = Math.hypot(ballX - prevBallX, ballY - prevBallY);
            if (inside && dist > 1.2) {
                const numSparkles = Math.min(4, Math.max(1, Math.floor(dist / 5)));
                for (let i = 0; i < numSparkles; i++) {
                    const t = Math.random();
                    const px = prevBallX + (ballX - prevBallX) * t + (Math.random() - 0.5) * 6;
                    const py = prevBallY + (ballY - prevBallY) * t + (Math.random() - 0.5) * 6;
                    sparkles.push({
                        x: px,
                        y: py,
                        vx: (Math.random() - 0.5) * 22,
                        vy: (Math.random() - 0.5) * 22 + 6,
                        size: Math.random() * 4.5 + 3.5,
                        rotation: Math.random() * Math.PI,
                        rotSpeed: (Math.random() - 0.5) * 5,
                        color: PINK_SPARKLES[Math.floor(Math.random() * PINK_SPARKLES.length)],
                        age: 0,
                        maxLife: Math.random() * 200 + 380,
                    });
                }
            }

            // Update & render pink sparkles
            for (let i = sparkles.length - 1; i >= 0; i--) {
                const s = sparkles[i];
                s.age += dt * 1000;
                if (s.age >= s.maxLife) {
                    sparkles.splice(i, 1);
                    continue;
                }
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.rotation += s.rotSpeed * dt;
                const lifeRatio = s.age / s.maxLife;
                const currentSize = s.size * (1 - lifeRatio * 0.7);
                const alpha = Math.sin((1 - lifeRatio) * Math.PI * 0.5);
                drawSparkle(ctx, s.x, s.y, currentSize, s.rotation, s.color, alpha);
            }

            const isLink = !!linkEl;

            let link: { left: number; width: number; bottom: number } | null =
                null;
            if (linkEl) {
                const r = linkEl.getBoundingClientRect();
                const topLeft = localize(r.left, r.top);
                const bottomRight = localize(r.right, r.bottom);
                link = {
                    left: topLeft.x,
                    width: bottomRight.x - topLeft.x,
                    bottom: bottomRight.y,
                };
                ballX = link.left + link.width / 2;
                ballY = link.bottom;
                lineTargetWidth = link.width;
            } else {
                lineTargetWidth = 0;
            }

            const ease = 1 - Math.exp(-dt * (SNAPPINESS * 1.5));
            const targetRadius =
                overRing || isLink ? (p.size * HOVER_SCALE) / 2 : p.size / 2;
            radius += (targetRadius - radius) * ease;
            fillOpacity += ((overRing || isLink ? 0 : 1) - fillOpacity) * ease;
            strokeOpacity +=
                ((overRing && !isLink ? 1 : 0) - strokeOpacity) * ease;
            lineOpacity += ((isLink ? 1 : 0) - lineOpacity) * ease;
            lineWidth += (lineTargetWidth - lineWidth) * ease;

            if (!inside) {
                raf = requestAnimationFrame(frame);
                return;
            }

            // Draw complementary-colored cursor
            if (isLink && link && lineOpacity > 0.01) {
                const y = link.bottom + 1;
                const startX = link.left + (link.width - lineWidth) / 2;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(startX + lineWidth, y);
                ctx.strokeStyle = `rgba(${Math.round(currR)}, ${Math.round(currG)}, ${Math.round(currB)}, ${lineOpacity})`;
                ctx.lineWidth = BORDER_WIDTH;
                ctx.lineCap = "round";
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(ballX, ballY, Math.max(0.5, radius), 0, Math.PI * 2);
                if (strokeOpacity > 0.01) {
                    ctx.strokeStyle = `rgba(${Math.round(currR)}, ${Math.round(currG)}, ${Math.round(currB)}, ${strokeOpacity})`;
                    ctx.lineWidth = BORDER_WIDTH;
                    ctx.stroke();
                }
                if (fillOpacity > 0.01) {
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = "transparent";
                    ctx.fillStyle = `rgba(${Math.round(currR)}, ${Math.round(currG)}, ${Math.round(currB)}, ${fillOpacity})`;
                    ctx.fill();
                }
            }
            } catch (err) {
                console.error("DotCursor render error:", err);
                hideNativeCursor(false);
            }

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        const onBlur = () => hideNativeCursor(false);
        window.addEventListener("blur", onBlur);

        return () => {
            cancelAnimationFrame(raf);
            hideNativeCursor(false);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("resize", resize);
            window.removeEventListener("blur", onBlur);
            ro?.disconnect();
            document.documentElement.removeEventListener(
                "pointerleave",
                onWindowLeave
            );
        };
    }, []);

    const labelNode = label ? (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                whiteSpace: "pre",
                pointerEvents: "none",
                userSelect: "none",
                ...labelFont,
                color: labelColor,
            }}
        >
            {labelText}
        </div>
    ) : null;

    return (
        <div
            ref={frameRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: "none",
                ...style,
            }}
        >
            {labelNode}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}