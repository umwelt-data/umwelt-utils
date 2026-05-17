export interface AxisTicks {
  x?: any[];
  y?: any[];
}

export function getVegaAxisTicks(scene: any): AxisTicks | null {
  const axisNodes = findNodeByRole(scene, 'axis');
  if (!axisNodes.length) return null;

  let xTicks: any[] | undefined;
  let yTicks: any[] | undefined;

  for (const axisNode of axisNodes) {
    const axisView = axisNode.items?.[0];
    if (!axisView) continue;

    const orient: string | undefined = axisView.orient;
    const isX = orient === 'bottom' || orient === 'top';

    const tickGroup = axisView.items?.find((item: any) => item.role === 'axis-tick');
    if (!tickGroup?.items?.length) continue;

    const values = tickGroup.items.map((n: any) => n.datum?.value);

    if (isX && !xTicks) {
      xTicks = values;
    } else if (!isX && !yTicks) {
      yTicks = values;
    }

    if (xTicks && yTicks) break;
  }

  if (!xTicks && !yTicks) return null;
  return { x: xTicks, y: yTicks };
}

export function findNodeByRole(node: any, role: string, found: any[] = []): any[] {
  if ('role' in node) {
    if (node.role === role) {
      found.push(node);
    }
    if (node.items) {
      return node.items.reduce((acc: any[], n: any) => findNodeByRole(n, role, acc), found);
    }
    return found;
  }
  if ('items' in node) {
    return node.items.reduce((acc: any[], n: any) => findNodeByRole(n, role, acc), found);
  }
  return found;
}
