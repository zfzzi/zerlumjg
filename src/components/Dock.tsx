import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "motion/react";
import { useRef } from "react";
import "./Dock.css";

export type DockItemData = {
  label: string;
  onClick: () => void;
  className?: string;
};

function DockItem({
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
}: {
  className?: string;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  label: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return value - rect.x - rect.width / 2;
  });

  const targetWidth = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );
  const width = useSpring(targetWidth, spring);

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  }

  return (
    <motion.button
      ref={ref}
      style={{ width }}
      onClick={onClick}
      className={`dock-item ${className}`}
      aria-label={label}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <span>{label}</span>
    </motion.button>
  );
}

export default function Dock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 112,
  distance = 200,
  panelHeight = 48,
  baseItemSize = 92,
}: {
  items: DockItemData[];
  className?: string;
  spring?: SpringOptions;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div style={{ height: panelHeight, scrollbarWidth: "none" }} className="dock-outer">
      <motion.div
        onMouseMove={({ pageX }) => {
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Zerlum workspace navigation"
      >
        {items.map((item) => (
          <DockItem
            key={item.label}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
          />
        ))}
      </motion.div>
    </div>
  );
}
