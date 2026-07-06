// "use client";

// import { DropZone } from "@measured/puck";

// export default function DraggableTable({
//   rows = 3,
//   cols = 3,
//   align = "left",
//   headerSize = "16px",
//   headerColor = "#000",
//   altRowColor = "#f7f7f7"
// }) {
//   return (
//     <div style={{ overflowX: "auto" }}>
//       <table
//         style={{
//           width: "100%",
//           borderCollapse: "collapse",
//           textAlign: align
//         }}
//       >
//         <tbody>
//           {Array.from({ length: rows }).map((_, r) => (
//             <tr
//               key={r}
//               style={{
//                 background: r % 2 === 1 ? altRowColor : "transparent"
//               }}
//             >
//               {Array.from({ length: cols }).map((_, c) => {
//                 const isHeader = r === 0;

//                 return (
//                   <td
//                     key={c}
//                     style={{
//                       border: "1px solid #ddd",
//                       padding: "10px",
//                       fontSize: isHeader ? headerSize : "14px",
//                       fontWeight: isHeader ? "600" : "400",
//                       color: isHeader ? headerColor : "#333",
//                       verticalAlign: "top"
//                     }}
//                   >
//                     <DropZone zone={`table-cell-${r}-${c}`} />
//                   </td>
//                 );
//               })}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }


"use client";

import { DropZone } from "@measured/puck";

export default function DraggableTable({
  rows = 3,
  cols = 3,

  textAlign = "left",
  verticalAlign = "top",

  headerSize = "16px",
  headerColor = "#000",

  cellBg = "transparent",
  altRowColor = "#f7f7f7",

  cellPadding = "10px",
  minCellHeight = "60px"
}) {
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse"
        }}
      >
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr
              key={r}
              style={{
                background: r % 2 === 1 ? altRowColor : "transparent"
              }}
            >
              {Array.from({ length: cols }).map((_, c) => {
                const isHeader = r === 0;

                return (
                  <td
                    key={c}
                    style={{
                      border: "1px solid #ddd",
                      padding: 0,
                      verticalAlign: "top"
                    }}
                  >
                    {/* CELL CONTAINER (THIS IS WHERE STYLING HAPPENS) */}
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        minHeight: minCellHeight,

                        padding: cellPadding,
                        background: cellBg,

                        justifyContent:
                          textAlign === "center"
                            ? "center"
                            : textAlign === "right"
                            ? "flex-end"
                            : "flex-start",

                        alignItems:
                          verticalAlign === "middle"
                            ? "center"
                            : verticalAlign === "bottom"
                            ? "flex-end"
                            : "flex-start",

                        textAlign: textAlign
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          fontSize: isHeader ? headerSize : "14px",
                          fontWeight: isHeader ? "600" : "400",
                          color: isHeader ? headerColor : "#333"
                        }}
                      >
                        <DropZone zone={`table-cell-${r}-${c}`} />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
