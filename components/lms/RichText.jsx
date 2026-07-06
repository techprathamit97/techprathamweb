"use client";

export default function RichText({
  content = "Add your <strong>text</strong> here",
  tag = "div",

  color = "#000000",
  backgroundColor = "transparent",

  fontSize = "16px",
  mobileFontSize = "14px",
  fontWeight = "400",
  lineHeight = "1.6",
  letterSpacing = "0px",

  textAlign = "left",
  textTransform = "none",

  linkColor = "#2563eb",
  linkHoverColor = "#1e40af",

  maxWidth = "100%",
  margin = "0 auto",
}) {
  const Tag = tag;

  return (
    <>
      <style>{`
        .rich-text {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          width: 100%;
        }

        .rich-text strong {
          font-weight: 700;
        }

        .rich-text em {
          font-style: italic;
        }

        .rich-text u {
          text-decoration: underline;
        }

        .rich-text a {
          color: ${linkColor};
          text-decoration: underline;
          font-weight: 500;
        }

        .rich-text a:hover {
          color: ${linkHoverColor};
        }

        @media (max-width: 768px) {
          .rich-text {
            font-size: ${mobileFontSize};
          }
        }
      `}</style>

      <Tag
        className="rich-text"
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
          margin,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}
