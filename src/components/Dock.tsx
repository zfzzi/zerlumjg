import "./Dock.css";

export type DockItemData = {
  label: string;
  onClick: () => void;
  className?: string;
};

export default function Dock({
  items,
  className = "",
  panelHeight = 44,
}: {
  items: DockItemData[];
  className?: string;
  spring?: unknown;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
}) {
  return (
    <nav
      className="dock-outer"
      style={{ height: panelHeight }}
      aria-label="Zerlum 工作面导航"
    >
      <div className={`dock-panel ${className}`} role="toolbar">
        {items.map((item) => (
          <button
            key={item.label}
            className={`dock-item ${item.className ?? ""}`}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
