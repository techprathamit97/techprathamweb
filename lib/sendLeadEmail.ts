// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_CODE);
// const admin = process.env.ADMIN_EMAIL || "";

// const FORM_LABELS: Record<string, string> = {
//   "reach-form": "Reach Out Widget",
//   "lead-form": "Course Callback",
//   "certificate": "Certificate Inquiry",
//   "training-lead": "Training Lead",
// };

// export async function sendLeadEmail(data: any) {
//   const formLabel = FORM_LABELS[data.formType] || data.formType;

//   await resend.emails.send({
//     from: "TechPratham <onboarding@resend.dev>",
//     to: [admin],
//     subject: `📩 New Lead (${formLabel}) - TechPratham`,
//     html: `
//       <div style="font-family: Arial, sans-serif; line-height:1.6">
//         <h2>📞 New Lead Received</h2>

//         <p><strong>Form Type:</strong> ${formLabel}</p>
//         <hr />

//         <p><strong>Name:</strong> ${data.fullName || "-"}</p>
//         <p><strong>Email:</strong> ${data.email || "-"}</p>
//         <p><strong>Phone:</strong> ${data.phone || "-"}</p>
//         <p><strong>Course:</strong> ${data.course || "-"}</p>

//         ${
//           data.message
//             ? `<p><strong>Message:</strong> ${data.message}</p>`
//             : ""
//         }

//         <hr />

//         <p><strong>IP Address:</strong> ${data.ipAddress}</p>
//         <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>

//         <br />
//         <p style="color:#6b7280;font-size:13px">
//           Auto-generated lead from TechPratham website
//         </p>
//       </div>
//     `,
//   });
// }

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_CODE);
const admin = process.env.ADMIN_EMAIL || "";

const FORM_LABELS: Record<string, string> = {
  "reach-form": "Reach Out Widget",
  "lead-form": "Course Callback",
  "certificate": "Certificate Inquiry",
  "training-lead": "Training Lead",
};

export async function sendLeadEmail(data: any) {
  const formLabel = FORM_LABELS[data.formType] || data.formType;

  await resend.emails.send({
    from: "TechPratham <onboarding@resend.dev>",
    to: [admin],
    subject: `📩 New Lead (${formLabel}) - TechPratham`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>New Lead</title>
      </head>
      <body style="margin:0; padding:20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155;">
        <div style="max-width:600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">📞 New Lead Received</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${formLabel} Submission</p>
          </div>

          <!-- Badge -->
          <div style="text-align:center; margin: -20px auto 0; position: relative; z-index: 1;">
            <span style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: inline-block;">
              ⭐ HOT LEAD
            </span>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">

            <!-- Lead Information -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">👤 Lead Information</h2>
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; border-left: 4px solid #ef4444;">
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Name:</strong> ${data.fullName || "-"}</p>
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Email:</strong> ${data.email || "-"}</p>
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Phone:</strong> <span style="color:#dc2626; font-size:16px; font-weight:700;">${data.phone || "-"}</span></p>
              </div>
            </div>

            <!-- Course Info -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px;">📚 Course Interest</h2>
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Course:</strong> ${data.course || "-"}</p>
              </div>
            </div>

            <!-- Message (Optional) -->
            ${
              data.message
                ? `<div style="margin-bottom: 30px;">
                    <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px;">📝 Message</h2>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px;">${data.message}</div>
                  </div>`
                : ""
            }

            <!-- IP Address -->
            <div style="margin-bottom: 30px;">
              <h2 style="color:#1e293b; font-size:20px; font-weight:600; margin:0 0 20px;">🛡️ Lead Origin</h2>
              <div style="background:#eef2ff; border-radius:12px; padding:20px; border-left:4px solid #6366f1;">
                <p><strong style="width: 150px; display: inline-block; color: #64748b;">IP Address:</strong> ${data.ipAddress || "Unknown"}</p>
                <p><strong style="width: 150px; display: inline-block; color: #64748b;">Submitted At:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>

            <!-- Footer Note -->
            <div style="text-align: center; margin-top: 40px;">
              <p style="color: #6b7280; font-size: 13px;">
                Auto-generated lead from TechPratham website
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `,
  });
}
