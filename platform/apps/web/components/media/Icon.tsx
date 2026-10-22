export type IconName = "arrow" | "back" | "close" | "chevron" | "external" | "check" | "star" | "plus";

export type IconProps = {
  name: IconName;
  size?: number | string;
  className?: string;
  label?: string;
  direction?: "up" | "down" | "left" | "right";
  filled?: boolean;
};

const paths: Record<IconName, string> = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  close: "m6 6 12 12M18 6 6 18",
  chevron: "m6 9 6 6 6-6",
  external: "M14 4h6v6m0-6-9 9M10 4H4v16h16v-6",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  star: "m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z",
};

/** Decorative beside text by default; label standalone informational icons. */
export function Icon({ name, size = "1em", className, label, direction = "down", filled = false }: IconProps) {
  const rotation = { down: 0, left: 90, up: 180, right: -90 }[direction];
  return <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={name === "star" && filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden={label ? undefined : true}
    role={label ? "img" : undefined}
    aria-label={label}
    style={{ display: "inline-block", verticalAlign: "-0.125em", flexShrink: 0 }}
  ><path d={paths[name]} transform={name === "chevron" && rotation ? `rotate(${rotation} 12 12)` : undefined}/></svg>;
}
