"use client";

export default function ImageSection({
  imageUrl = "",
  altText = "",
  width = "100%",
  height = "100%",
  objectFit = "cover",
  position = "center",
  overlayColor = "",
  borderRadius = "0px"
}) {
  return (
    <section
      style={{
        width,
        height,
        // position: "relative",
        overflow: "hidden",
        borderRadius,
        margin: 0,
        padding: 0,
        lineHeight: 0 
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={altText || ""}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition: position,
            margin: 0,
            padding: 0
          }}
        />
      )}

      {overlayColor && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: overlayColor,
            pointerEvents: "none"
          }}
        />
      )}
    </section>
  );
}
