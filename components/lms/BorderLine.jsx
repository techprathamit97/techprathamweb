// "use client";

// export default function BorderLine({
//   orientation = "horizontal",
//   color = "#000000",
//   length = "100%",
//   thickness = "2px",
//   styleType = "solid",
// }) {
//   const isHorizontal = orientation === "horizontal";

//   // ───────── Zigzag (SVG based) ─────────
//   if (styleType === "zigzag") {
//     const size = parseInt(thickness) || 2;
//     const zigzagHeight = size * 2;

//     return (
//       <div
//         style={{
//           width: isHorizontal ? length : thickness,
//           height: isHorizontal ? thickness : length,
//           overflow: "hidden",
//         }}
//       >
//         <svg
//           width={isHorizontal ? "100%" : zigzagHeight}
//           height={isHorizontal ? zigzagHeight : "100%"}
//           viewBox={
//             isHorizontal
//               ? `0 0 100 ${zigzagHeight}`
//               : `0 0 ${zigzagHeight} 100`
//           }
//           preserveAspectRatio="none"
//         >
//           <polyline
//             points={
//               isHorizontal
//                 ? `0 ${zigzagHeight / 2} 10 0 20 ${
//                     zigzagHeight / 2
//                   } 30 0 40 ${zigzagHeight / 2} 50 0 60 ${
//                     zigzagHeight / 2
//                   } 70 0 80 ${zigzagHeight / 2} 90 0 100 ${
//                     zigzagHeight / 2
//                   }`
//                 : `0 0 ${zigzagHeight / 2} 10 0 20 ${
//                     zigzagHeight / 2
//                   } 30 0 40 ${zigzagHeight / 2} 50 0 60 ${
//                     zigzagHeight / 2
//                   } 70 0 80 ${zigzagHeight / 2} 90 0 100`
//             }
//             fill="none"
//             stroke={color}
//             strokeWidth={size}
//           />
//         </svg>
//       </div>
//     );
//   }

//   // ───────── Normal Lines ─────────
//   return (
//     <div
//       style={{
//         width: isHorizontal ? length : thickness,
//         height: isHorizontal ? thickness : length,
//         backgroundColor: styleType === "solid" ? color : "transparent",
//         borderTop:
//           isHorizontal && styleType !== "solid"
//             ? `${thickness} ${styleType} ${color}`
//             : "none",
//         borderLeft:
//           !isHorizontal && styleType !== "solid"
//             ? `${thickness} ${styleType} ${color}`
//             : "none",
//       }}
//     />
//   );
// }

"use client";

export default function BorderLine({
  orientation = "horizontal",
  color = "#000000",
  length = "100%",
  thickness = "2px",
  styleType = "solid",

  /* MARGIN */
  marginTop = "0px",
  marginRight = "0px",
  marginBottom = "0px",
  marginLeft = "0px",

  /* PADDING */
  paddingTop = "0px",
  paddingRight = "0px",
  paddingBottom = "0px",
  paddingLeft = "0px",
}) {
  const isHorizontal = orientation === "horizontal";

  const wrapperStyle = {
    margin: `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`,
    padding: `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`,
  };

  /* ───────── Zigzag (SVG) ───────── */
  if (styleType === "zigzag") {
    const size = parseInt(thickness) || 2;
    const zigzagHeight = size * 2;

    return (
      <div style={wrapperStyle}>
        <div
          style={{
            width: isHorizontal ? length : thickness,
            height: isHorizontal ? thickness : length,
            overflow: "hidden",
          }}
        >
          <svg
            width={isHorizontal ? "100%" : zigzagHeight}
            height={isHorizontal ? zigzagHeight : "100%"}
            viewBox={
              isHorizontal
                ? `0 0 100 ${zigzagHeight}`
                : `0 0 ${zigzagHeight} 100`
            }
            preserveAspectRatio="none"
          >
            <polyline
              points={
                isHorizontal
                  ? `0 ${zigzagHeight / 2} 10 0 20 ${
                      zigzagHeight / 2
                    } 30 0 40 ${zigzagHeight / 2} 50 0 60 ${
                      zigzagHeight / 2
                    } 70 0 80 ${zigzagHeight / 2} 90 0 100 ${
                      zigzagHeight / 2
                    }`
                  : `0 0 ${zigzagHeight / 2} 10 0 20 ${
                      zigzagHeight / 2
                    } 30 0 40 ${zigzagHeight / 2} 50 0 60 ${
                      zigzagHeight / 2
                    } 70 0 80 ${zigzagHeight / 2} 90 0 100`
              }
              fill="none"
              stroke={color}
              strokeWidth={size}
            />
          </svg>
        </div>
      </div>
    );
  }

  /* ───────── Normal Lines ───────── */
  return (
    <div style={wrapperStyle}>
      <div
        style={{
          width: isHorizontal ? length : thickness,
          height: isHorizontal ? thickness : length,
          backgroundColor: styleType === "solid" ? color : "transparent",
          borderTop:
            isHorizontal && styleType !== "solid"
              ? `${thickness} ${styleType} ${color}`
              : "none",
          borderLeft:
            !isHorizontal && styleType !== "solid"
              ? `${thickness} ${styleType} ${color}`
              : "none",
        }}
      />
    </div>
  );
}
