export type DialogSourceRect = Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">;
type Size = { width: number; height: number };
export type DialogAnchor = { top: number; left: number };

const viewportPadding = 16;
const sourceGap = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function getDialogAnchor(source: DialogSourceRect | undefined, viewport: Size, dialog: Size): DialogAnchor | undefined {
  if (!source) return undefined;
  const left = clamp(source.left, viewportPadding, viewport.width - dialog.width - viewportPadding);
  const below = source.bottom + sourceGap;
  const top = below + dialog.height <= viewport.height - viewportPadding
    ? below
    : source.top - dialog.height - sourceGap;
  return { top: clamp(top, viewportPadding, viewport.height - dialog.height - viewportPadding), left };
}
