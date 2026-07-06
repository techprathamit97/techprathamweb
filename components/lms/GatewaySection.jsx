export default function GatewaySection({
  heading = "Your Gateway to Global IT Careers",
  description = "",
  highlight = "",
  image = ""
}) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        padding: "10px",
        background: "linear-gradient(135deg, #fde7f3, #e8f0ff)",
        borderRadius: "20px",
        alignItems: "center",
      }}
      className="gateway-section"
    >
      {/* LEFT IMAGE */}
      <div className="gateway-image">
        {image && (
          <img
            src={image}
            alt="Institute"
            style={{
              width: "100%",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      {/* RIGHT CONTENT */}
      <div className="gateway-content">
        <h1
          style={{
            fontSize: "36px",
            width: "100%",
            fontWeight: "700",
            marginBottom: "20px",
          }}
        >
          {heading}
        </h1>

        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#333",
          }}
        >
          <strong style={{ color: "#7c3aed" }}>{highlight}</strong>{" "}
          {description}
        </p>
      </div>

      {/* RESPONSIVE STYLES */}
      <style jsx>{`
      @media (max-width: 768px) {
  .gateway-section {
    grid-template-columns: 1fr;
    padding: 30px;
    gap: 20px;
  }

  .gateway-image {
    grid-column: 1 / -1;  /* Make sure image takes full width */
    width: 100%;
  }

  .gateway-image img {
    width: 100%;
    height: auto;
    display: block; /* remove inline issues */
    margin-bottom: 20px; /* spacing between image and text */
  }

  .gateway-content{
   grid-column: 1 / -1;  /* Make sure image takes full width */
    width: 100%;
  }

  .gateway-content h1 {
    font-size: 28px;
    
  }

  .gateway-content p {
    font-size: 14px;
  }
}
`}</style>
    </section>
  );
}
