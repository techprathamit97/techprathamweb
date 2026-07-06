import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_CODE);
const admin = process.env.ADMIN_EMAIL || "techprathamit@gmail.com";

export async function sendQuizCompletionEmail(data: any) {
  const {
    userEmail,
    userName,
    quizTitle,
    totalMarks,
    maxMarks,
    percentage,
    passed
  } = data;

  await resend.emails.send({
    from: "TechPratham <onboarding@resend.dev>",
    to: [admin],
    subject: `🎯 Quiz Completed: ${quizTitle} - ${passed ? 'PASSED' : 'FAILED'} - TechPratham`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Quiz Completion</title>
      </head>
      <body style="margin:0; padding:20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155;">
        <div style="max-width:600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${passed ? '#10b981' : '#ef4444'} 0%, ${passed ? '#059669' : '#dc2626'} 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎯 Quiz Completed</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${quizTitle}</p>
          </div>

          <!-- Badge -->
          <div style="text-align:center; margin: -20px auto 0; position: relative; z-index: 1;">
            <span style="background: linear-gradient(135deg, ${passed ? '#34d399' : '#fbbf24'} 0%, ${passed ? '#10b981' : '#f59e0b'} 100%); color: ${passed ? '#064e3b' : '#78350f'}; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: inline-block;">
              ${passed ? '✅ PASSED' : '📚 NEEDS REVIEW'}
            </span>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">

            <!-- Student Information -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">👤 Student Information</h2>
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; border-left: 4px solid #ef4444;">
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Name:</strong> ${userName}</p>
                <p><strong style="width: 100px; display: inline-block; color: #64748b;">Email:</strong> <span style="color:#dc2626; font-size:16px; font-weight:700;">${userEmail}</span></p>
              </div>
            </div>

            <!-- Quiz Results -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px;">📊 Quiz Results</h2>
              <div style="background: ${passed ? '#f0fdf4' : '#fef3c7'}; border-radius: 12px; padding: 20px; border-left: 4px solid ${passed ? '#22c55e' : '#f59e0b'};">
                <p><strong style="width: 120px; display: inline-block; color: #64748b;">Quiz:</strong> ${quizTitle}</p>
                <p><strong style="width: 120px; display: inline-block; color: #64748b;">Score:</strong> <span style="font-size: 18px; font-weight: 700; color: ${passed ? '#16a34a' : '#d97706'};">${totalMarks}/${maxMarks} (${percentage}%)</span></p>
                <p><strong style="width: 120px; display: inline-block; color: #64748b;">Status:</strong> <span style="font-size: 16px; font-weight: 700; color: ${passed ? '#16a34a' : '#d97706'};">${passed ? 'PASSED ✅' : 'FAILED ❌'}</span></p>
              </div>
            </div>

            <!-- Completion Details -->
            <div style="margin-bottom: 30px;">
              <h2 style="color:#1e293b; font-size:20px; font-weight:600; margin:0 0 20px;">⏰ Completion Details</h2>
              <div style="background:#eef2ff; border-radius:12px; padding:20px; border-left:4px solid #6366f1;">
                <p><strong style="width: 150px; display: inline-block; color: #64748b;">Completed At:</strong> ${new Date().toLocaleString()}</p>
                <p><strong style="width: 150px; display: inline-block; color: #64748b;">Next Action:</strong> ${passed ? 'Follow up for next steps' : 'Provide additional support'}</p>
              </div>
            </div>

            <!-- Action Required -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <h3 style="color: white; margin: 0 0 10px 0; font-size: 18px;">⚡ Action Required</h3>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">
                Please follow up with ${userName} regarding their quiz performance.
              </p>
            </div>

            <!-- Footer Note -->
            <div style="text-align: center; margin-top: 40px;">
              <p style="color: #6b7280; font-size: 13px;">
                Auto-generated quiz completion notification from TechPratham
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `,
  });
}