export default function HeroSection({
  tag = "CORPORATE UPSKILLING",
  title = "Future-Ready Workforce Solutions",
  subtitle = "Transforming Talent Into Impact",
  description = "We partner with organizations to deliver customized training solutions that empower teams, strengthen leadership, and drive sustainable growth.",
  backgroundImage = ""
}) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "220px",
        padding: "10px",
        color: "#fff",
        backgroundImage: `
          linear-gradient(
            to right,
            rgba(60, 0, 0, 0.85),
            rgba(120, 0, 0, 0.7),
            rgba(0, 0, 0, 0.4)
          ),
          url(${backgroundImage})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // borderRadius: "20px",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div style={{ maxWidth: "600px" }}>
        {/* TAG */}
        <p
          style={{
            letterSpacing: "2px",
            fontSize: "12px",
            marginBottom: "16px",
            opacity: 0.9
          }}
        >
          {tag}
        </p>

        {/* MAIN TITLE */}
        <h1
          style={{
            fontSize: "25px",
            fontWeight: "600",
            marginBottom: "5px"
          }}
        >
          {title}
        </h1>

        {/* SUB TITLE */}
        <h2
          style={{
            fontSize: "46px",
            fontWeight: "800",
            marginBottom: "20px"
          }}
        >
          {subtitle}
        </h2>

        {/* DESCRIPTION */}
        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.7",
            opacity: 0.95
          }}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
