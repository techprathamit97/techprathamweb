// "use client";

// export default function CustomText({
//   content = "Add your text here",
//   tag = "p",

//   color = "#000",
//   backgroundColor = "transparent",

//   fontSize = "16px",
//   mobileFontSize = "14px",

//   fontWeight = "400",
//   lineHeight = "1.5",
//   letterSpacing = "0px",

//   textAlign = "left",
//   textTransform = "none",

//   maxWidth = "100%",
//   margin = "0 auto",
// }) {
//   const Tag = tag;

//   return (
//     <>
//       <style>
//         {`
//           .custom-text {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//             width: 100%;
//           }

//           @media (max-width: 768px) {
//             .custom-text {
//               font-size: ${mobileFontSize} !important;
//             }
//           }
//         `}
//       </style>

//       <Tag
//         className="custom-text"
//         style={{
//           color,
//           backgroundColor,
//           fontSize,
//           fontWeight,
//           lineHeight,
//           letterSpacing,
//           textAlign,
//           textTransform,
//           maxWidth,
//           margin,
//           display: tag === "span" ? "inline-block" : "block",
//         }}
//       >
//         {content}
//       </Tag>
//     </>
//   );
// }

"use client";

export default function CustomText({
  content = "Add your text here",
  tag = "p",

  color = "#000",
  backgroundColor = "transparent",

  fontSize = "16px",
  mobileFontSize = "14px",

  fontWeight = "400",
  lineHeight = "1.5",
  letterSpacing = "0px",

  textAlign = "left",
  textTransform = "none",

  maxWidth = "100%",

  /* MARGIN */
  marginTop = "0px",
  marginRight = "auto",
  marginBottom = "0px",
  marginLeft = "auto",

  /* PADDING */
  paddingTop = "0px",
  paddingRight = "0px",
  paddingBottom = "0px",
  paddingLeft = "0px",
}) {
  const Tag = tag;

  return (
    <>
      <style>
        {`
          .custom-text {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            width: 100%;
          }

          @media (max-width: 768px) {
            .custom-text {
              font-size: ${mobileFontSize} !important;
            }
          }
        `}
      </style>

      <Tag
        className="custom-text"
        style={{
          color,
          backgroundColor,
          fontSize,
          fontWeight,
          lineHeight,
          letterSpacing,
          textAlign,
          textTransform,
          maxWidth,

          /* APPLY MARGIN */
          margin: `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`,

          /* APPLY PADDING */
          padding: `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`,

          display: tag === "span" ? "inline-block" : "block",
        }}
      >
        {content}
      </Tag>
    </>
  );
}
