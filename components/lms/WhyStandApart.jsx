// export default function WhyStandApart({
//   title = "Why Tech Pratham Stands Apart",

//   card1Title = "100% Live Training",
//   card1Desc = "Interactive online and hybrid sessions with real-time doubt resolution and expert guidance",

//   card2Title = "24/7 Student Support",
//   card2Desc = "Dedicated assistance throughout your learning journey and beyond placement",

//   card3Title = "100% Placement Guarantee",
//   card3Desc = "Guaranteed job support with partnerships across 150+ corporate clients globally",

//   leftTitle = "Expert Faculty",
//   leftDesc = "Industry professionals with 35+ years of collective experience from top MNCs like Wipro, TCS, Accenture, and Deloitte bring real-world insights to every session.",

//   rightTitle = "Real Project Experience",
//   rightDesc = "Gain hands-on experience with 100+ industry-specific projects across BFSI, Healthcare, Manufacturing, and Retail sectors.",

//   footerText = "Our flexible batch switching policy allows students to adapt their learning schedule without additional costs, whilst our ISO 9001:2015 certification ensures quality standards that meet international benchmarks."
// }) {
//   return (
//     <section
//       style={{
//         padding: "70px",
//         background: "linear-gradient(135deg, #fde7f3, #eef2ff)",
//         borderRadius: "24px"
//       }}
//     >
//       {/* TITLE */}
//       <h2 style={{ fontSize: "40px", marginBottom: "40px" }}>
//         {title}
//       </h2>

//       {/* TOP CARDS */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3, 1fr)",
//           gap: "24px",
//           marginBottom: "50px"
//         }}
//       >
//         {[ 
//           { t: card1Title, d: card1Desc },
//           { t: card2Title, d: card2Desc },
//           { t: card3Title, d: card3Desc }
//         ].map((c, i) => (
//           <div
//             key={i}
//             style={{
//               background: "#f3d9ff",
//               padding: "24px",
//               borderRadius: "14px"
//             }}
//           >
//             <h4 style={{ marginBottom: "10px" }}>{c.t}</h4>
//             <p style={{ fontSize: "14px", lineHeight: "1.6" }}>{c.d}</p>
//           </div>
//         ))}
//       </div>

//       {/* BOTTOM CONTENT */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr",
//           gap: "40px",
//           marginBottom: "30px"
//         }}
//       >
//         <div>
//           <h4>{leftTitle}</h4>
//           <p style={{ lineHeight: "1.7" }}>{leftDesc}</p>
//         </div>

//         <div>
//           <h4>{rightTitle}</h4>
//           <p style={{ lineHeight: "1.7" }}>{rightDesc}</p>
//         </div>
//       </div>

//       {/* FOOTER */}
//       <p style={{ maxWidth: "900px", lineHeight: "1.7" }}>
//         {footerText}
//       </p>
//     </section>
//   );
// }

export default function WhyStandApart({
  title = "Why Tech Pratham Stands Apart",
  card1Title = "100% Live Training",
  card1Desc = "Interactive online and hybrid sessions with real-time doubt resolution and expert guidance",
  card2Title = "24/7 Student Support",
  card2Desc = "Dedicated assistance throughout your learning journey and beyond placement",
  card3Title = "100% Placement Guarantee",
  card3Desc = "Guaranteed job support with partnerships across 150+ corporate clients globally",
  leftTitle = "Expert Faculty",
  leftDesc = "Industry professionals with 35+ years of collective experience from top MNCs like Wipro, TCS, Accenture, and Deloitte bring real-world insights to every session.",
  rightTitle = "Real Project Experience",
  rightDesc = "Gain hands-on experience with 100+ industry-specific projects across BFSI, Healthcare, Manufacturing, and Retail sectors.",
  footerText = "Our flexible batch switching policy allows students to adapt their learning schedule without additional costs, whilst our ISO 9001:2015 certification ensures quality standards that meet international benchmarks."
}) {

  return (
    <section
      style={{
        padding: "10px",
        background: "linear-gradient(135deg, #fde7f3, #eef2ff)",
        // borderRadius: "24px",
      }}
    >
      {/* TITLE */}
      <h2
        style={{
          fontSize: "40px",
          marginBottom: "10px",
          textAlign: "center",
        }}
      >
        {title}
      </h2>

      {/* TOP CARDS */}
      <div
        className="top-cards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "10px",
        }}
      >
        {[ 
          { t: card1Title, d: card1Desc },
          { t: card2Title, d: card2Desc },
          { t: card3Title, d: card3Desc },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              background: "#f3d9ff",
              padding: "14px",
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <h4 style={{ marginBottom: "10px" }}>{c.t}</h4>
            <p style={{ fontSize: "14px", lineHeight: "1.6" }}>{c.d}</p>
          </div>
        ))}
      </div>

      {/* BOTTOM CONTENT */}
      <div
        className="bottom-content"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          marginBottom: "10px",
        }}
      >
        <div>
          <h4>{leftTitle}</h4>
          <p style={{ lineHeight: "1.7" }}>{leftDesc}</p>
        </div>

        <div>
          <h4>{rightTitle}</h4>
          <p style={{ lineHeight: "1.7" }}>{rightDesc}</p>
        </div>
      </div>

      {/* FOOTER */}
      <p
        style={{
          maxWidth: "900px",
          lineHeight: "1.7",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {footerText}
      </p>

      {/* RESPONSIVE STYLES */}
      <style>{`
        @media (max-width: 768px) {
          .top-cards {
            grid-template-columns: 1fr !important;
          }
          .bottom-content {
            grid-template-columns: 1fr !important;
          }
          section {
            padding: 30px !important;
          }
          h2 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
          }
        }
      `}</style>
    </section>
  );
}
