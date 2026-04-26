export interface HighlightStyle {
  stroke: string;
  strokeWidth: number;
  fill: string;
  fillOpacity: number;
}

export const DEFAULT_HIGHLIGHT_STYLE: HighlightStyle = {
  stroke: '#0284c7',
  strokeWidth: 2,
  fill: '#0284c7',
  fillOpacity: 0.1,
};

const HIGHLIGHT_CLASS = 'bluefish-bridge-highlight';

export function renderHighlights(
  svg: SVGSVGElement,
  bboxes: DOMRect[],
  style: HighlightStyle,
): void {
  clearHighlights(svg);
  for (const bbox of bboxes) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.classList.add(HIGHLIGHT_CLASS);
    rect.setAttribute('x', String(bbox.x));
    rect.setAttribute('y', String(bbox.y));
    rect.setAttribute('width', String(bbox.width));
    rect.setAttribute('height', String(bbox.height));
    rect.setAttribute('stroke', style.stroke);
    rect.setAttribute('stroke-width', String(style.strokeWidth));
    rect.setAttribute('fill', style.fill);
    rect.setAttribute('fill-opacity', String(style.fillOpacity));
    rect.setAttribute('pointer-events', 'none');
    svg.appendChild(rect);
  }
}

export function clearHighlights(svg: SVGSVGElement): void {
  const existing = svg.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  existing.forEach((el) => el.remove());
}
