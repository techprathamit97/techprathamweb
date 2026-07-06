// "use client";

// import { DropZone } from "@measured/puck";

// export default function TwoColumnMediaSection({
//   padding = "10px 10px",
//   background = "#FEECFE",
//   gap = "32px",
//   align = "center"
// }) {
//   return (
//     <section
//       style={{
//         background,
//         padding
//       }}
//     >
//       <div
//         style={{
//           maxWidth: "1200px",
//           margin: "0 auto",
//           display: "flex",
//           alignItems: align,
//           gap
//         }}
//         className="two-col-wrapper"
//       >
//         {/* LEFT */}
//         <div
//           style={{
//             flex: 1
//           }}
//         >
//           <DropZone zone="left-media" />
//         </div>

//         {/* RIGHT */}
//         <div
//           style={{
//             flex: 1
//           }}
//         >
//           <DropZone zone="right-content" />
//         </div>
//       </div>

//       {/* SIMPLE RESPONSIVE CSS */}
//       <style>{`
//         @media (max-width: 768px) {
//           .two-col-wrapper {
//             flex-direction: column;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }



// "use client";

// import { DropZone } from "@measured/puck";

// export default function TwoColumnMediaSection({
//   padding = "1px 1px",
//   background = "#FEECFE",
//   gap = "10px",
//   align = "center",
//   columns = "1" // ✅ string
// }) {
//   return (
//     <section style={{ background, padding }}>
//       <div
//         style={{
//           maxWidth: "1200px",
//           margin: "0 auto",
//           display: "flex",
//           alignItems: align,
//           gap
//         }}
//         className="two-col-wrapper"
//       >
//         {/* COLUMN 1 */}
//         <div style={{ flex: 1 }}>
//           <DropZone zone="column-1" />
//         </div>

//         {/* COLUMN 2 */}
//         {(columns === "2" || columns === "3") && (
//           <div style={{ flex: 1 }}>
//             <DropZone zone="column-2" />
//           </div>
//         )}

//         {/* COLUMN 3 */}
//         {columns === "3" && (
//           <div style={{ flex: 1 }}>
//             <DropZone zone="column-3" />
//           </div>
//         )}
//       </div>

//       <style>{`
//         @media (max-width: 768px) {
//           .two-col-wrapper {
//             flex-direction: column;
//           }
//          .two-col-item {
//             padding: 0;
//             margin: 0;
//           }
//           .two-col-item > div {
//             min-height: auto;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }

// "use client";

// import { DropZone } from "@measured/puck";

// export default function TwoColumnMediaSection({
//   padding = "1px 1px",
//   background = "#FEECFE",
//   gap = "10px",
//   align = "center",
//   columns = "1",

//   // ✅ NEW
//   col1Width = "50"
// }) {
//   // convert to numbers safely
//   const col1 = Number(col1Width);
//   const col2 = 100 - col1;

//   return (
//     <section style={{ background, padding }}>
//       <div
//         className="two-col-wrapper"
//         style={{
//           maxWidth: "1200px",
//           margin: "0 auto",
//           display: "flex",
//           alignItems: align,
//           gap
//         }}
//       >
//         {/* COLUMN 1 */}
//         <div
//           style={{
//             width: columns !== "1" ? `${col1}%` : "100%"
//           }}
//         >
//           <DropZone zone="column-1" />
//         </div>

//         {/* COLUMN 2 */}
//         {columns === "2" && (
//           <div style={{ width: `${col2}%` }}>
//             <DropZone zone="column-2" />
//           </div>
//         )}

//         {/* COLUMN 3 (equal split for now) */}
//         {columns === "3" && (
//           <>
//             <div style={{ width: "33.33%" }}>
//               <DropZone zone="column-2" />
//             </div>
//             <div style={{ width: "33.33%" }}>
//               <DropZone zone="column-3" />
//             </div>
//           </>
//         )}
//       </div>

//       {/* MOBILE FIX */}
//       <style>{`
//         @media (max-width: 768px) {
//           .two-col-wrapper {
//             flex-direction: column;
//           }

//           .two-col-wrapper > div {
//             width: 100% !important;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }

"use client";

import { DropZone } from "@measured/puck";

export default function TwoColumnMediaSection({
  /* SECTION */
  sectionPadding = "20px",
  sectionBackground = "#FEECFE",
  gap = "10px",
  align = "center",
  columns = "1",

  /* COLUMN WIDTH */
  col1Width = 50,

  /* ========= COLUMN 1 ========= */
  col1Bg = "transparent",
  col1MarginTop = "0px",
  col1MarginRight = "0px",
  col1MarginBottom = "0px",
  col1MarginLeft = "0px",
  col1PaddingTop = "0px",
  col1PaddingRight = "0px",
  col1PaddingBottom = "0px",
  col1PaddingLeft = "0px",

  col1BorderTop = "0px",
  col1BorderRight = "0px",
  col1BorderBottom = "0px",
  col1BorderLeft = "0px",
  col1BorderStyle = "solid",
  col1BorderColor = "#000000",

  /* ========= COLUMN 2 ========= */
  col2Bg = "transparent",
  col2MarginTop = "0px",
  col2MarginRight = "0px",
  col2MarginBottom = "0px",
  col2MarginLeft = "0px",
  col2PaddingTop = "0px",
  col2PaddingRight = "0px",
  col2PaddingBottom = "0px",
  col2PaddingLeft = "0px",

  col2BorderTop = "0px",
  col2BorderRight = "0px",
  col2BorderBottom = "0px",
  col2BorderLeft = "0px",
  col2BorderStyle = "solid",
  col2BorderColor = "#000000",

  /* ========= COLUMN 3 ========= */
  col3Bg = "transparent",
  col3MarginTop = "0px",
  col3MarginRight = "0px",
  col3MarginBottom = "0px",
  col3MarginLeft = "0px",
  col3PaddingTop = "0px",
  col3PaddingRight = "0px",
  col3PaddingBottom = "0px",
  col3PaddingLeft = "0px",

  col3BorderTop = "0px",
  col3BorderRight = "0px",
  col3BorderBottom = "0px",
  col3BorderLeft = "0px",
  col3BorderStyle = "solid",
  col3BorderColor = "#000000",
}) {
  const col1 = Number(col1Width);
  const col2 = 100 - col1;

  const box = (
    bg,
    mt, mr, mb, ml,
    pt, pr, pb, pl,
    bt, br, bb, bl,
    bStyle,
    bColor
  ) => ({
    background: bg,
    margin: `${mt} ${mr} ${mb} ${ml}`,
    padding: `${pt} ${pr} ${pb} ${pl}`,
    borderTop: `${bt} ${bStyle} ${bColor}`,
    borderRight: `${br} ${bStyle} ${bColor}`,
    borderBottom: `${bb} ${bStyle} ${bColor}`,
    borderLeft: `${bl} ${bStyle} ${bColor}`,
    boxSizing: "border-box",
  });

  return (
    <section style={{ background: sectionBackground, padding: sectionPadding }}>
      <div
        className="two-col-wrapper"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          gap,
          alignItems: align,
        }}
      >
        {/* COLUMN 1 */}
        <div
          style={{
            width: columns !== "1" ? `${col1}%` : "100%",
            ...box(
              col1Bg,
              col1MarginTop, col1MarginRight, col1MarginBottom, col1MarginLeft,
              col1PaddingTop, col1PaddingRight, col1PaddingBottom, col1PaddingLeft,
              col1BorderTop, col1BorderRight, col1BorderBottom, col1BorderLeft,
              col1BorderStyle,
              col1BorderColor
            ),
          }}
        >
          <DropZone zone="column-1" />
        </div>

        {/* COLUMN 2 */}
        {columns === "2" && (
          <div
            style={{
              width: `${col2}%`,
              ...box(
                col2Bg,
                col2MarginTop, col2MarginRight, col2MarginBottom, col2MarginLeft,
                col2PaddingTop, col2PaddingRight, col2PaddingBottom, col2PaddingLeft,
                col2BorderTop, col2BorderRight, col2BorderBottom, col2BorderLeft,
                col2BorderStyle,
                col2BorderColor
              ),
            }}
          >
            <DropZone zone="column-2" />
          </div>
        )}

        {/* COLUMN 3 */}
        {columns === "3" && (
          <>
            <div
              style={{
                width: "33.33%",
                ...box(
                  col2Bg,
                  col2MarginTop, col2MarginRight, col2MarginBottom, col2MarginLeft,
                  col2PaddingTop, col2PaddingRight, col2PaddingBottom, col2PaddingLeft,
                  col2BorderTop, col2BorderRight, col2BorderBottom, col2BorderLeft,
                  col2BorderStyle,
                  col2BorderColor
                ),
              }}
            >
              <DropZone zone="column-2" />
            </div>

            <div
              style={{
                width: "33.33%",
                ...box(
                  col3Bg,
                  col3MarginTop, col3MarginRight, col3MarginBottom, col3MarginLeft,
                  col3PaddingTop, col3PaddingRight, col3PaddingBottom, col3PaddingLeft,
                  col3BorderTop, col3BorderRight, col3BorderBottom, col3BorderLeft,
                  col3BorderStyle,
                  col3BorderColor
                ),
              }}
            >
              <DropZone zone="column-3" />
            </div>
          </>
        )}
      </div>

      {/* MOBILE */}
      <style>{`
        @media (max-width: 768px) {
          .two-col-wrapper {
            flex-direction: column;
          }
          .two-col-wrapper > div {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
