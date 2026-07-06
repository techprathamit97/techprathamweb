

// "use client";

// import { DropZone } from "@measured/puck";


// const normalizeContainer = c => ({
//   cols: Number(c?.cols || 3),
//   rows: Number(c?.rows || 2),
//   gap: c?.gap || "16px",
//   width: c?.width || "1200px",
//   alignX: c?.alignX || "center",
//   alignY: c?.alignY || "center"
// });

// /* ------------------ COMPONENT ------------------ */
// export default function HeroSectionEditor(props = {}) {
//   const container = normalizeContainer(props.container);
//   const overlay = props.overlay || {};
//   const backgroundImage = props.backgroundImage || "";

//   const alignXMap = {
//     left: "flex-start",
//     center: "center",
//     right: "flex-end"
//   };

//   const alignYMap = {
//     top: "flex-start",
//     center: "center",
//     bottom: "flex-end"
//   };

//   return (
//     <section
//       style={{
//         width: "100%",
//         minHeight: "420px",
//         display: "flex",
//         justifyContent: alignXMap[container.alignX],
//         alignItems: alignYMap[container.alignY],
//         backgroundImage: `
//           ${overlay?.type === "linear-gradient"
//             ? `linear-gradient(${overlay.value}),`
//             : ""}
//           url(${backgroundImage})
//         `,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         borderRadius: "16px",
//         padding: "20px"
//       }}
//     >
//       <div
//         style={{
//           width: "100%",
//           maxWidth: container.width,
//           display: "grid",
//           gridTemplateColumns: `repeat(${container.cols}, 1fr)`,
//           gridTemplateRows: `repeat(${container.rows}, auto)`,
//           gap: container.gap
//         }}
//       >
//         {Array.from({ length: container.cols * container.rows }).map(
//           (_, index) => (
//             <div
//               key={index}
//               style={{
//                 minHeight: "90px",
//                 border: "1px dashed #9bb7ff",
//                 borderRadius: "10px",
//                 background: "rgba(255,255,255,0.6)",
//                 padding: "8px"
//               }}
//             >
//               <DropZone zone={`hero-grid-zone-${index}`} />
//             </div>
//           )
//         )}
//       </div>
//     </section>
//   );
// }



"use client";

import { DropZone } from "@measured/puck";

/* ------------------ COMPONENT ------------------ */
export default function HeroSectionEditor({
  backgroundImage = "",
  cols = "2",
  rows = "2",
  gap = "20px",
  width = "1200px",
  alignX = "center"
}) {
  const columnCount = Number(cols);
  const rowCount = Number(rows);
  const totalZones = columnCount * rowCount;

  const alignXMap = {
    left: "flex-start",
    center: "center",
    right: "flex-end"
  };

  return (
    <section
      style={{
        width: "100%",
        minHeight: "420px",
        display: "flex",
        justifyContent: alignXMap[alignX],
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        // padding: "24px",
        borderRadius: "16px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: width,
          display: "grid",
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gridTemplateRows: `repeat(${rowCount}, minmax(80px, auto))`,
          gap
        }}
      >
        {Array.from({ length: totalZones }).map((_, index) => (
          <div
            key={index}
            style={{
              minHeight: "80px",
              border: "2px dashed #8aa9ff",
              borderRadius: "10px",
              // background: "rgba(255,255,255,0.65)",
              padding: "8px"
            }}
          >
            <DropZone zone={`hero-zone-${index}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
