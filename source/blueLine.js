// blueLine.js
// Draw a "blue line" (polyline) over the centre of a chosen bell symbol in each row,
// and also generate a standalone SVG file for download.

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
function measurePointsFromDOM(scroller, rows, targetChar) {
  const points = [];
  const scrollerRect = scroller.getBoundingClientRect();

  console.log("Entered measurePointsFromDOM");

  // Estimate monospace char width once
  const charWidth = estimateCharWidth(scroller);

  for (let i = 0; i < rows.length; i++) {
    const codeEl = scroller.querySelector(`.row-item[data-row="${i}"] code`);
    if (!codeEl) continue;

    const original = codeEl.dataset?.text || codeEl.textContent || "";
    const idx = original.indexOf(targetChar);
    if (idx === -1) continue; // skip rows without the target

    const codeRect = codeEl.getBoundingClientRect();
    // Position relative to the scroller content origin
    const y = scroller.scrollTop + (codeRect.top - scrollerRect.top) + codeRect.height / 2;
    const x = scroller.scrollLeft + (codeRect.left - scrollerRect.left) + (idx + 0.5) * charWidth;
    // console.log("point: ", x, y);
    points.push([x, y]);
  }
  return points;
}

/**
 * Estimate monospace character width within this scroller.
 */
function estimateCharWidth(scroller) {
  const probe = document.createElement("span");
  probe.textContent = "MMMMMMMMMM"; // 10 Ms
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.font = getComputedStyle(scroller).font || "12px ui-monospace, monospace";
  scroller.appendChild(probe);
  const w = probe.getBoundingClientRect().width / 10;
  scroller.removeChild(probe);
  return w || 10;
}

/**
 * Create (or update) the overlay SVG inside the scroller.
 * The SVG is absolutely-positioned and sized to the scroller's scrollWidth/scrollHeight,
 * so it naturally scrolls with the content.
 */
export function renderBlueLineOverlay({
  scroller: scrollerRef = "#notationOutput",
  rows,
  targetChar,
  options = {},
}) {
  console.log("Entered renderBlueLineOverlay, rows len = ", rows.length);

  const scroller = resolveScroller(scrollerRef);
  if (!Array.isArray(rows) || !rows.length) {

  	  	console.log("   renderBlueLineOverlay: exiting, no row data");
		return;
	}

	console.log("   renderBlueLineOverlay: got row data");

  // Ensure scroller can host an absolute overlay
  const prevPos = getComputedStyle(scroller).position;
  if (prevPos === "static") scroller.style.position = "relative";

  // Ensure we have an SVG overlay
  let svg = scroller.querySelector("svg.blue-line-overlay");
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("blue-line-overlay");
    Object.assign(svg.style, {
      position: "absolute",
      left: "0",
      top: "0",
      pointerEvents: "none",
      // width/height set below in pixels to cover scroll area
    });
    scroller.appendChild(svg);
  }

  // Size overlay to content
  const contentW = Math.max(scroller.scrollWidth, scroller.clientWidth);
  const contentH = Math.max(scroller.scrollHeight, scroller.clientHeight);
  svg.setAttribute("width", String(contentW));
  svg.setAttribute("height", String(contentH));
  svg.setAttribute("viewBox", `0 0 ${contentW} ${contentH}`);
  svg.style.width = contentW + "px";
  svg.style.height = contentH + "px";

  // Compute points
  const pts = measurePointsFromDOM(scroller, rows, targetChar);
  // Clear and draw
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (pts.length >= 2) {
    const poly = document.createElementNS(SVG_NS, "polyline");
    poly.setAttribute(
      "points",
      pts.map(([x, y]) => `${x},${y}`).join(" ")
    );
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", options.color || "dodgerblue");
    poly.setAttribute("stroke-width", String(options.width ?? 2));
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("stroke-linecap", "round");
    svg.appendChild(poly);
  }
}

/**
 * Remove the overlay SVG (if present).
 */
export function removeBlueLineOverlay(scrollerRef = "#notationOutput") {
  const scroller = resolveScroller(scrollerRef);
  const svg = scroller.querySelector("svg.blue-line-overlay");
  if (svg) svg.remove();
}

/**
 * Build a standalone SVG string for download, using simple metrics
 * (doesn't require DOM). You can tune metrics to match your page layout.
 *
 * metrics:
 *   rowHeight: px distance between row centres
 *   charWidth: px width of one character (monospace)
 *   paddingX / paddingY: outer padding
 */
export function buildBlueLineSVG(rows, targetChar, options = {}, metrics = {}) {
  const {
    rowHeight = 20,
    charWidth = 12,
    paddingX = 8,
    paddingY = 8,
  } = metrics;

  const pts = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? "";
    const idx = row.indexOf(targetChar);
    if (idx === -1) continue;
    const x = paddingX + (idx + 0.5) * charWidth;
    const y = paddingY + i * rowHeight + rowHeight / 2;
    pts.push([x, y]);
  }
  if (pts.length < 2) {
    // Return minimal SVG if not enough points
    const w = paddingX * 2 + 10 * charWidth;
    const h = paddingY * 2 + Math.max(1, rows.length) * rowHeight;
    return `<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }

  // compute bounds
  const maxX = Math.max(...pts.map(([x]) => x)) + paddingX;
  const maxY = Math.max(...pts.map(([, y]) => y)) + paddingY;

  const stroke = options.color || "dodgerblue";
  const strokeW = String(options.width ?? 2);

  return [
    `<svg xmlns="${SVG_NS}" width="${Math.ceil(maxX)}" height="${Math.ceil(maxY)}` +
      `" viewBox="0 0 ${Math.ceil(maxX)} ${Math.ceil(maxY)}">`,
    `<polyline points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}"`,
    `  fill="none" stroke="${escapeAttr(stroke)}" stroke-width="${strokeW}"`,
    `  stroke-linejoin="round" stroke-linecap="round" />`,
    `</svg>`,
  ].join("\n");
}

/**
 * Trigger a download of the given SVG string.
 */
export function downloadSVG(svgString, filename = "blue-line.svg") {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
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
