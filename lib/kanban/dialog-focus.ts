export function focusTrapIndex(count: number, currentIndex: number, shiftKey: boolean) {
  if (count === 0) return null;
  if (!shiftKey && currentIndex === count - 1) return 0;
  if (shiftKey && currentIndex === 0) return count - 1;
  return null;
}
