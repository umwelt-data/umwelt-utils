export interface BluefishMountResult {
  svgElement: SVGSVGElement;
  destroy: () => void;
}

export async function mountBluefish(
  container: HTMLElement,
  children: () => Promise<unknown[]>,
): Promise<BluefishMountResult> {
  const [{ render }, resolvedChildren] = await Promise.all([
    import('bluefish-js'),
    children(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destroy = render(() => resolvedChildren as any, container);

  const svgElement = container.querySelector('svg') as SVGSVGElement;

  return { svgElement, destroy };
}
