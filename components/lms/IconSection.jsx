"use client";

export default function IconTextSection({
  iconUrl = "",
  text = "Your text goes here",
  position = "left", // left | right | top | bottom
  size = "40px",
  gap = "10px",
  textAlign = "left",
}) {
  const isRow = position === "left" || position === "right";
  const isReverse = position === "right" || position === "bottom";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: "center",
        gap,
        textAlign,
      }}
    >
      {!isReverse && (
        <Icon iconUrl={iconUrl} size={size} />
      )}

      <div>{text}</div>

      {isReverse && (
        <Icon iconUrl={iconUrl} size={size} />
      )}
    </section>
  );
}

function Icon({ iconUrl, size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        backgroundColor: "#e5e7eb",
        flexShrink: 0,
      }}
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}
