// "use client";

// export default function CustomList({
//   items = "Item 1\nItem 2\nItem 3",
//   listType = "ul",
//   color = "#000",
//   fontSize = "16px",
//   mobileFontSize = "14px",
//   lineHeight = "1.6",
//   markerColor = "#000",
// }) {
//   const listItems = items
//     .split("\n")
//     .map((i) => i.trim())
//     .filter(Boolean);

//   return (
//     <>
//       <style>{`
//         .custom-list {
//           padding-left: 22px;
//           color: ${color};
//           font-size: ${fontSize};
//           line-height: ${lineHeight};
//           list-style-position: outside;
//         }

//         .custom-list.ul {
//           list-style-type: disc;
//         }

//         .custom-list.ol {
//           list-style-type: decimal;
//         }

//         .custom-list li::marker {
//           color: ${markerColor};
//         }

//         .check-list {
//           list-style: none;
//           padding-left: 0;
//         }

//         .check-list li {
//           display: flex;
//           gap: 8px;
//         }

//         .check-list li::before {
//           content: "✔";
//           color: ${markerColor};
//           font-weight: 700;
//         }

//         @media (max-width: 768px) {
//           .custom-list {
//             font-size: ${mobileFontSize};
//           }
//         }
//       `}</style>

//       {listType === "ul" && (
//         <ul className="custom-list ul">
//           {listItems.map((item, i) => (
//             <li key={i}>{item}</li>
//           ))}
//         </ul>
//       )}

//       {listType === "ol" && (
//         <ol className="custom-list ol">
//           {listItems.map((item, i) => (
//             <li key={i}>{item}</li>
//           ))}
//         </ol>
//       )}

//       {listType === "check" && (
//         <ul className="custom-list check-list">
//           {listItems.map((item, i) => (
//             <li key={i}>{item}</li>
//           ))}
//         </ul>
//       )}
//     </>
//   );
// }


"use client";

export default function CustomList({
  items = "Item 1\nItem 2\nItem 3",
  listType = "ul-disc",

  color = "#000000",
  markerColor = "#000000",

  fontSize = "16px",
  mobileFontSize = "14px",
  fontWeight = "400",
  lineHeight = "1.6",

  textAlign = "left",
  gap = "8px",

  maxWidth = "100%",
  margin = "0",
}) {
  const listItems = items
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const isUL = listType.startsWith("ul");
  const isOL = listType.startsWith("ol");

  return (
    <>
      <style>{`
        .custom-list {
          margin: ${margin};
          max-width: ${maxWidth};
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          line-height: ${lineHeight};
          text-align: ${textAlign};

          padding-left: 22px;
          list-style-position: outside;
        }

        .custom-list li {
          margin-bottom: ${gap};
        }

        .custom-list li::marker {
          color: ${markerColor};
        }

        /* BULLET TYPES */
        .ul-disc { list-style-type: disc; }
        .ul-circle { list-style-type: circle; }
        .ul-square { list-style-type: square; }

        /* NUMBER TYPES */
        .ol-decimal { list-style-type: decimal; }
        .ol-decimal-leading-zero { list-style-type: decimal-leading-zero; }
        .ol-roman { list-style-type: upper-roman; }
        .ol-alpha { list-style-type: upper-alpha; }

        /* CHECK LIST */
        .check-list {
          list-style: none;
          padding-left: 0;
        }
        .check-list li {
          display: flex;
          gap: 8px;
        }
        .check-list li::before {
          content: "✔";
          color: ${markerColor};
          font-weight: 700;
        }

        /* ARROW LIST */
        .arrow-list {
          list-style: none;
          padding-left: 0;
        }
        .arrow-list li::before {
          content: "➜";
          margin-right: 8px;
          color: ${markerColor};
        }

        /* STAR LIST */
        .star-list {
          list-style: none;
          padding-left: 0;
        }
        .star-list li::before {
          content: "★";
          margin-right: 8px;
          color: ${markerColor};
        }

        @media (max-width: 768px) {
          .custom-list {
            font-size: ${mobileFontSize};
          }
        }
      `}</style>

      {isUL && (
        <ul className={`custom-list ${listType}`}>
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {isOL && (
        <ol className={`custom-list ${listType}`}>
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      )}

      {listType === "check" && (
        <ul className="custom-list check-list">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {listType === "arrow" && (
        <ul className="custom-list arrow-list">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      {listType === "star" && (
        <ul className="custom-list star-list">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </>
  );
}
