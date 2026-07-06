"use client";

import { DropZone } from "@measured/puck";

export default function TableWithHeader({
  rows = 6,
  cols = 5,

  headerBg = "#0f4c64",
  headerText = "#ffffff",

  rowBg = "#ffffff",
  altRowBg = "#f1f5f9",

  borderColor = "#e5e7eb",
}) {
  return (
    <section className="w-full overflow-x-auto">
      <div
        style={{
          minWidth: "900px",
          border: `1px solid ${borderColor}`,
          borderRadius: "12px",
          overflow: "scroll",
        }}
      >
        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(10px, 1fr))`,
          }}
        >
          {/* HEADER */}
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={`header-${colIndex}`}
              style={{
                background: headerBg,
                color: headerText,
                padding: "14px",
                fontWeight: 600,
                borderRight: `1px solid ${borderColor}`,
              }}
            >
              <DropZone zone={`kpi-header-${colIndex}`} />
            </div>
          ))}

          {/* BODY */}
          {Array.from({ length: rows }).map((_, rowIndex) =>
            Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                style={{
                  padding: "12px",
                  background:
                    rowIndex % 2 === 0 ? rowBg : altRowBg,
                  borderTop: `1px solid ${borderColor}`,
                  borderRight: `1px solid ${borderColor}`,
                }}
              >
                <DropZone
                  zone={`kpi-cell-${rowIndex}-${colIndex}`}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

