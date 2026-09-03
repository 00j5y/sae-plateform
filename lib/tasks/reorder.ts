export function nextPosition(before: number | null, after: number | null) {
  if (before === null) {
    return (after ?? 1000) - 1000;
  }

  if (after === null) {
    return before + 1000;
  }

  return (before + after) / 2;
}
