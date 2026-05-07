export function applyHighlight(svg: SVGSVGElement, ids: string[], dimOpacity = 0.3): void {
  const elements = svg.querySelectorAll('[data-bluefish-id]');
  elements.forEach((el) => {
    const id = el.getAttribute('data-bluefish-id');
    (el as SVGElement).style.opacity = ids.includes(id!) ? '1' : String(dimOpacity);
  });
}

export function clearHighlight(svg: SVGSVGElement): void {
  const elements = svg.querySelectorAll('[data-bluefish-id]');
  elements.forEach((el) => {
    (el as SVGElement).style.opacity = '';
  });
}
