// blueLine.js
// Draw a "blue line" (polyline) over the centre of a chosen bell symbol in each row,
// and also generate a standalone SVG file for download.

import {log} from './newAlg.js';

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Ensure we can find the scroller (#notationOutput) from a node or id.
 */
function resolveScroller(target) {
    if (!target) throw new Error("blueLine: missing scroller target");
    if (typeof target === "string") {
        const el = document.getElementById(target) || document.querySelector(target);
        if (!el) throw new Error(`blueLine: no element matches selector/id "${target}"`);
        return el;
    }
    return target;
}

/**
 * Compute the x,y centre for the targetChar in each row by measuring the DOM.
 * Assumes rows are rendered as:
 *   <div class="row-item" data-row="i"><code [data-text="original"]>visible</code></div>
 */
/**
 * Find the client rect of the character at `charIndex` in the *flattened*
 * textContent of `root`, even if the text is split across spans/text nodes.
 */
function getCharRectInElement(root, charIndex) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let remaining = charIndex;
    let node;

    while ((node = walker.nextNode())) {
        const len = node.textContent.length;
        if (remaining < len) {
            const range = document.createRange();
            range.setStart(node, remaining);
            range.setEnd(node, remaining + 1);
            const rect = range.getBoundingClientRect();
            range.detach?.();
            return rect;
        }
        remaining -= len;
    }

    return null;
}

/**
 * Measure visual points for a given targetChar in each row.
 * `rows[i]` should be the plain row string (e.g. "123456"),
 * even if the DOM has ghost spans etc.
 */
export function measurePointsFromDOM(scroller, rows, targetChar) {
    const points = [];
    const scrollerRect = scroller.getBoundingClientRect();

    for (let i = 0; i < rows.length; i++) {
        const codeEl = scroller.querySelector(`.row-item[data-row="${i}"] code`);
        if (!codeEl) continue;

        const rowText = rows[i] ?? "";
        const idx = rowText.indexOf(targetChar);
        if (idx === -1) continue; // row doesn't contain the target

        const charRect = getCharRectInElement(codeEl, idx);
        if (!charRect || !charRect.width || !charRect.height) continue;

        const x = scroller.scrollLeft + (charRect.left - scrollerRect.left) + charRect.width / 2;

        const y = scroller.scrollTop + (charRect.top - scrollerRect.top) + charRect.height / 2;

        points.push([x, y]);
    }
    return points;
}

/**
 * Create (or update) the overlay SVG inside the scroller.
 * The SVG is absolutely-positioned and sized to the scroller's scrollWidth/scrollHeight,
 * so it naturally scrolls with the content.
 */
export function renderBlueLineOverlay({
                                          scroller: scrollerRef = "#notationOutput", rows, targetChar, options = {},
                                      }) {
    log("Entered renderBlueLineOverlay, rows len = ", rows?.length ?? 0);

    const scroller = resolveScroller(scrollerRef);
    if (!Array.isArray(rows) || rows.length === 0) {
        log("   renderBlueLineOverlay: exiting, no row data");
        return;
    }
    if (targetChar == null) {
        log("   renderBlueLineOverlay: exiting, no targetChar");
        return;
    }
    log("   renderBlueLineOverlay: got row data");

    // Ensure scroller can host an absolute overlay
    const prevPos = getComputedStyle(scroller).position;
    if (prevPos === "static") scroller.style.position = "relative";

    // Ensure we have an SVG overlay
    let svg = scroller.querySelector("svg.blue-line-overlay");
    if (!svg) {
        svg = document.createElementNS(SVG_NS, "svg");
        svg.classList.add("blue-line-overlay");
        Object.assign(svg.style, {
            position: "absolute", left: "0", top: "0", pointerEvents: "none", // overlay shouldn't eat scroll/hover
        });
        scroller.appendChild(svg);
    }

    // Size overlay to content (covers full scroll area)
    const contentW = Math.max(scroller.scrollWidth, scroller.clientWidth);
    const contentH = Math.max(scroller.scrollHeight, scroller.clientHeight);
    svg.setAttribute("width", String(contentW));
    svg.setAttribute("height", String(contentH));
    svg.setAttribute("viewBox", `0 0 ${contentW} ${contentH}`);
    svg.style.width = contentW + "px";
    svg.style.height = contentH + "px";

    // --- multiple overlays support: one <g> layer per targetChar ---
    const layerKey = String(targetChar);
    const safeKey = CSS && CSS.escape ? CSS.escape(layerKey) : layerKey.replace(/"/g, '&quot;');

    let layer = svg.querySelector(`g[data-key="${safeKey}"]`);
    if (!layer) {
        layer = document.createElementNS(SVG_NS, "g");
        layer.setAttribute("data-key", layerKey);
        svg.appendChild(layer);
    } else {
        // Clear only this target's layer (do NOT wipe entire svg)
        while (layer.firstChild) layer.removeChild(layer.firstChild);
    }

    // Compute points for this target
    const pts = measurePointsFromDOM(scroller, rows, targetChar);

    // Draw this target's polyline into its own layer
    if (pts.length >= 2) {
        const poly = document.createElementNS(SVG_NS, "polyline");
        poly.setAttribute("points", pts.map(([x, y]) => `${x},${y}`).join(" "));
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", options.color || "dodgerblue");
        poly.setAttribute("stroke-width", String(options.width ?? 2));
        poly.setAttribute("stroke-linejoin", "round");
        poly.setAttribute("stroke-linecap", "round");
        layer.appendChild(poly);
    }
}

export function renderLeadSeparators({
                                         scroller: scrollerRef = "#notationOutput",
                                         rows,
                                         leadLength,
                                         leadHeadOffset = 0,
                                         options = {},
                                     }) {
    log("Entered renderLeadSeparators, rows len = ", rows?.length ?? 0);

    const scroller = resolveScroller(scrollerRef);
    if (!Array.isArray(rows) || rows.length === 0) {
        log("   renderLeadSeparators: exiting, no row data");
        return;
    }
    if (!Number.isInteger(leadLength) || leadLength <= 0) {
        log("   renderLeadSeparators: exiting, invalid leadLength =", leadLength);
        return;
    }

    // Ensure scroller can host an absolute overlay
    const prevPos = getComputedStyle(scroller).position;
    if (prevPos === "static") scroller.style.position = "relative";

    // Ensure we have an SVG overlay (reuse same svg as other overlays)
    let svg = scroller.querySelector("svg.blue-line-overlay");
    if (!svg) {
        svg = document.createElementNS(SVG_NS, "svg");
        svg.classList.add("blue-line-overlay");
        Object.assign(svg.style, {
            position: "absolute",
            left: "0",
            top: "0",
            pointerEvents: "none",
        });
        scroller.appendChild(svg);
    }

    // Size overlay to content (covers full scroll area)
    const contentW = Math.max(scroller.scrollWidth, scroller.clientWidth);
    const contentH = Math.max(scroller.scrollHeight, scroller.clientHeight);
    svg.setAttribute("width", String(contentW));
    svg.setAttribute("height", String(contentH));
    svg.setAttribute("viewBox", `0 0 ${contentW} ${contentH}`);
    svg.style.width = contentW + "px";
    svg.style.height = contentH + "px";

    // --- multiple overlays support: fixed <g> layer for lead separators ---
    const layerKey = "lead-separators";
    const safeKey = CSS && CSS.escape ? CSS.escape(layerKey) : layerKey.replace(/"/g, "&quot;");

    let layer = svg.querySelector(`g[data-key="${safeKey}"]`);
    if (!layer) {
        layer = document.createElementNS(SVG_NS, "g");
        layer.setAttribute("data-key", layerKey);
        svg.appendChild(layer);
    } else {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
    }

    // We assume every row renders as a line of text already in the DOM.
    // We'll measure:
    //  - left edge of first character in row 0
    //  - right edge of last character in row 0 (all rows same length)
    //  - y positions at the row boundaries (bottom of row k)
    //
    // This relies on the same DOM structure as measurePointsFromDOM().
    // If your measurePointsFromDOM() already knows how to map (rowIndex,charIndex) -> point,
    // we can piggyback on it to get consistent geometry.

    const row0 = rows[0];
    const rowLen = String(row0).length;
    if (rowLen === 0) return;

    // Use existing measuring helper for stable geometry:
    // - leftmost point: char 0
    // - rightmost point: char (rowLen - 1)
    //
    // measurePointsFromDOM returns points for occurrences of targetChar, so we *can't* use it directly.
    // Instead, we measure using DOM ranges on the rendered row nodes.
    //
    // Expectation: each rendered row is in an element with a stable selector/data attribute.
    // Common pattern is something like: scroller.querySelector(`[data-row-index="${i}"]`)
    // If your app differs, adjust getRowEl() below.

    const getRowEl = (i) =>
        scroller.querySelector(`[data-row-index="${i}"]`) ||
        scroller.querySelectorAll(".notation-row")[i] ||
        scroller.children[i];

    const rowEl0 = getRowEl(0);
    if (!rowEl0) {
        log("   renderLeadSeparators: exiting, couldn't find row DOM elements");
        return;
    }

    // Find the text node to measure (prefer first text node descendant)
    const findFirstTextNode = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        return walker.nextNode();
    };

    const textNode0 = findFirstTextNode(rowEl0);
    if (!textNode0 || !textNode0.nodeValue) {
        log("   renderLeadSeparators: exiting, couldn't find text node in row");
        return;
    }

    const scrollerRect = scroller.getBoundingClientRect();

    const rangeForChar = (textNode, idx) => {
        const r = document.createRange();
        r.setStart(textNode, idx);
        r.setEnd(textNode, idx + 1);
        return r;
    };

    const leftRect = rangeForChar(textNode0, 0).getBoundingClientRect();
    const rightRect = rangeForChar(textNode0, rowLen - 1).getBoundingClientRect();

    const xLeft = leftRect.left - scrollerRect.left + scroller.scrollLeft;
    const xRight = rightRect.right - scrollerRect.left + scroller.scrollLeft;

    const stroke = options.color || "#999";
    const strokeW = options.width ?? 1;
    // const leadRowOffset = options.leadRowOffset || 0;
    // const leadRowOffset = o.leadRowOffset || 0;

    const startRowIndex = leadHeadOffset === 0 ? leadLength : leadHeadOffset;
    // const startRowIndex = leadRowOffset === 0 ? leadLength : leadRowOffset;

    // Draw a line after every leadLength rows:
    // "between text item number n*leadLength and the next line"
    // => after rowIndex = (n*leadLength - 1)  (1-based boundary)
    //
    // Example leadLength=4 => after rows 3,7,11,... (0-based)
    for (let boundary = startRowIndex; boundary < rows.length+1; boundary += leadLength) {
        const rowEl = getRowEl(boundary - 1);
        if (!rowEl) continue;

        // y at bottom of that row
        const r = rowEl.getBoundingClientRect();
        const y = r.bottom - scrollerRect.top + scroller.scrollTop;

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", String(xLeft));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(xRight));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", stroke);
        line.setAttribute("stroke-width", String(strokeW));
        // line.setAttribute("stroke-dasharray", options.dash ?? "2,2");
        line.setAttribute("shape-rendering", "crispEdges");
        layer.appendChild(line);
    }
}

/**
 * Remove the overlay SVG (if present).
 */
// export function removeBlueLineOverlay(scrollerRef = "#notationOutput") {
//     const scroller = resolveScroller(scrollerRef);
//     const svg = scroller.querySelector("svg.blue-line-overlay");
//     if (svg) svg.remove();
// }

/**
 * Build a standalone SVG string for download, using simple metrics
 * (doesn't require DOM). You can tune metrics to match your page layout.
 *
 * metrics:
 *   rowHeight: px distance between row centres
 *   charWidth: px width of one character (monospace)
 *   paddingX / paddingY: outer padding
 */
// export function buildBlueLineSVG(rows, targetChar, options = {}, metrics = {}) {
//     const {
//         rowHeight = 20, charWidth = 12, paddingX = 8, paddingY = 8,
//     } = metrics;
//
//     const pts = [];
//     for (let i = 0; i < rows.length; i++) {
//         const row = rows[i] ?? "";
//         const idx = row.indexOf(targetChar);
//         if (idx === -1) continue;
//         const x = paddingX + (idx + 0.5) * charWidth;
//         const y = paddingY + i * rowHeight + rowHeight / 2;
//         pts.push([x, y]);
//     }
//     if (pts.length < 2) {
//         // Return minimal SVG if not enough points
//         const w = paddingX * 2 + 10 * charWidth;
//         const h = paddingY * 2 + Math.max(1, rows.length) * rowHeight;
//         return `<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
//     }
//
//     // compute bounds
//     const maxX = Math.max(...pts.map(([x]) => x)) + paddingX;
//     const maxY = Math.max(...pts.map(([, y]) => y)) + paddingY;
//
//     const stroke = options.color || "dodgerblue";
//     const strokeW = String(options.width ?? 2);
//
//     return [`<svg xmlns="${SVG_NS}" width="${Math.ceil(maxX)}" height="${Math.ceil(maxY)}` + `" viewBox="0 0 ${Math.ceil(maxX)} ${Math.ceil(maxY)}">`, `<polyline points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}"`, `  fill="none" stroke="${escapeAttr(stroke)}" stroke-width="${strokeW}"`, `  stroke-linejoin="round" stroke-linecap="round" />`, `</svg>`,].join("\n");
// }

/**
 * Trigger a download of the given SVG string.
 */
export function downloadSVG(svgString, filename = "blue-line.svg") {
    const blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
}
