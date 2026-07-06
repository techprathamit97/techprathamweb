"use client";

function getYouTubeEmbedUrl(url, autoplay) {
  if (!url) return "";

  // Handle youtu.be & youtube.com links
  const regExp =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/;
  const match = url.match(regExp);

  if (!match || !match[1]) return "";

  return `https://www.youtube.com/embed/${match[1]}?rel=0&autoplay=${
    autoplay ? 1 : 0
  }`;
}

export default function VideoSection({
  videoUrl = "",
  aspectRatio = "16/9",
  autoplay = false,
  controls = true,
  maxWidth = "100%",
  borderRadius = "0px",
  align = "center",
}) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl, autoplay);

  const paddingTop =
    aspectRatio === "4/3"
      ? "75%"
      : aspectRatio === "1/1"
      ? "100%"
      : "56.25%"; // 16:9 default

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
      {embedUrl ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop,
            overflow: "hidden",
            borderRadius,
          }}
        >
          <iframe
            src={embedUrl}
            allow={`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture`}
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "0",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            padding: "20px",
            background: "#f3f4f6",
            textAlign: "center",
            borderRadius,
            fontSize: "14px",
          }}
        >
          Add a valid YouTube URL
        </div>
      )}
    </section>
  );
}
