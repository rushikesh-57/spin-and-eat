// Distinct, accessible colors for wheel segments (readable contrast)
export const WHEEL_COLORS = [
  '#E63946', // red
  '#F4A261', // orange
  '#2A9D8F', // teal
  '#264653', // dark blue-green
  '#E9C46A', // yellow
  '#9B5DE5', // purple
  '#00BBF9', // sky blue
  '#F15BB5', // pink
  '#00F5D4', // mint
  '#FEE440', // gold
] as const;

export function getWheelColor(index: number): string {
  return WHEEL_COLORS[index % WHEEL_COLORS.length];
}
