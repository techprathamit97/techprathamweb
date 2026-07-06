"use client";

export default function ButtonSection({
  label = "Click Here",
  link = "#",
  target = "_self",
  align = "center",
  bgColor = "#e31818",
  textColor = "#ffffff",
  padding = "10px 18px",
  borderRadius = "6px",
  fontSize = "14px",
  maxWidth = "100%",
}) {
  return (
    <section
      style={{
        maxWidth,
        margin:
          align === "center"
            ? "0 auto"
            : align === "left"
            ? "0 auto 0 0"
            : "0 0 0 auto",
      }}
    >
      <a
        href={link}
        target={target}
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          background: bgColor,
          color: textColor,
          padding,
          borderRadius,
          fontSize,
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        {label}
      </a>
    </section>
  );
}
