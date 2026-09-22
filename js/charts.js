/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Lightweight inline SVG bar chart (no external chart library)
   Mark spec: <=24px bars, 4px rounded data-end / square baseline,
   2px surface gap between adjacent bars, hairline recessive gridlines.
   ========================================================================== */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
  return el;
}

// One shared tooltip element, reused by every chart on the page.
function getSharedTooltip() {
  let tip = document.getElementById("sharedChartTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "sharedChartTooltip";
    tip.className = "chart-tooltip";
    document.body.appendChild(tip);
  }
  return tip;
}

function showTooltip(evt, html) {
  const tip = getSharedTooltip();
  tip.innerHTML = html;
  tip.style.left = evt.clientX + "px";
  tip.style.top = evt.clientY + "px";
  tip.classList.add("visible");
}

function hideTooltip() {
  getSharedTooltip().classList.remove("visible");
}

/**
 * Renders a grouped bar chart.
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string[]} opts.categories - x-axis labels (e.g. month labels)
 * @param {{name: string, color: string, values: number[]}[]} opts.series
 * @param {number} [opts.height=260]
 */
function renderGroupedBarChart(container, opts) {
  const categories = opts.categories;
  const series = opts.series;
  const height = opts.height || 260;
  const width = container.clientWidth || 640;

  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...series.flatMap(function (s) { return s.values; }));
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

  const groupCount = categories.length;
  const groupW = plotW / groupCount;
  const barGap = 2;
  const barW = Math.min(24, (groupW - barGap * (series.length + 1)) / series.length);
  const groupInnerW = barW * series.length + barGap * (series.length - 1);

  container.innerHTML = "";
  const svg = svgEl("svg", {
    viewBox: "0 0 " + width + " " + height,
    width: "100%",
    height: height,
    role: "img",
    "aria-label": "Bar chart"
  });

  // Gridlines (4 horizontal steps) + y-axis labels
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (niceMax / steps) * i;
    const y = padding.top + plotH - (val / niceMax) * plotH;
    svg.appendChild(svgEl("line", {
      x1: padding.left, x2: width - padding.right, y1: y, y2: y,
      stroke: "#e1e0d9", "stroke-width": 1
    }));
    const label = svgEl("text", {
      x: padding.left - 8, y: y + 4, "text-anchor": "end",
      "font-size": 10.5, fill: "#898781", "font-family": "inherit"
    });
    label.textContent = Math.round(val);
    svg.appendChild(label);
  }

  // Baseline (slightly stronger)
  const baselineY = padding.top + plotH;
  svg.appendChild(svgEl("line", {
    x1: padding.left, x2: width - padding.right, y1: baselineY, y2: baselineY,
    stroke: "#c3c2b7", "stroke-width": 1
  }));

  // Bars + x labels
  categories.forEach(function (cat, gi) {
    const groupX = padding.left + gi * groupW + (groupW - groupInnerW) / 2;

    series.forEach(function (s, si) {
      const val = s.values[gi] || 0;
      const barH = (val / niceMax) * plotH;
      const x = groupX + si * (barW + barGap);
      const y = baselineY - barH;
      const rectHeight = Math.max(barH, 1);

      const rect = svgEl("rect", {
        x: x, y: y, width: barW, height: rectHeight,
        rx: 4, ry: 4,
        fill: s.color,
        style: "cursor:pointer"
      });
      // Square the baseline corner: overlay a small rect to flatten bottom radius visually
      const mask = svgEl("rect", {
        x: x, y: baselineY - Math.min(4, rectHeight), width: barW, height: Math.min(4, rectHeight),
        fill: s.color
      });

      rect.addEventListener("mousemove", function (evt) {
        showTooltip(evt, "<strong>" + s.name + "</strong> — " + cat + "<br/>" + val + " reviews");
      });
      rect.addEventListener("mouseleave", hideTooltip);

      svg.appendChild(rect);
      svg.appendChild(mask);
    });

    const xLabel = svgEl("text", {
      x: padding.left + gi * groupW + groupW / 2, y: height - 8,
      "text-anchor": "middle", "font-size": 11, fill: "#898781"
    });
    xLabel.textContent = cat;
    svg.appendChild(xLabel);
  });

  container.appendChild(svg);
}
