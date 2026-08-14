export function ChartShadowFilter({
  id,
  color,
  opacity = 0.28,
  blur = 3.5,
  offsetY = 4
}: {
  id: string;
  color: string;
  opacity?: number;
  blur?: number;
  offsetY?: number;
}) {
  return (
    <filter id={id} x="-25%" y="-55%" width="150%" height="230%" colorInterpolationFilters="sRGB">
      <feDropShadow dx="0" dy={offsetY} stdDeviation={blur} floodColor={color} floodOpacity={opacity} />
    </filter>
  );
}
