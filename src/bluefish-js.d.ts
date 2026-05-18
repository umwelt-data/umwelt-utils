declare module 'bluefish-js' {
  export function render(fn: () => unknown, container: HTMLElement): () => void;
}
