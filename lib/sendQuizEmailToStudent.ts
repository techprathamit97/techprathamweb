import nodemailer from 'nodemailer';

export async function sendQuizEmailToStudent(data: any) {
  const {
    userEmail,
    userName,
    quizTitle,
    totalMarks,
    maxMarks,
    percentage,
    passed
  } = data;

  // Create Gmail SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Email content for student
  const studentEmailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Quiz Results</title>
    </head>
    <body style="margin:0; padding:20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #334155;">
      <div style="max-width:600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${passed ? '#10b981' : '#ef4444'} 0%, ${passed ? '#059669' : '#dc2626'} 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎯 Quiz Results</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${quizTitle}</p>
        </div>

        <!-- Badge -->
        <div style="text-align:center; margin: -20px auto 0; position: relative; z-index: 1;">
          <span style="background: linear-gradient(135deg, ${passed ? '#34d399' : '#fbbf24'} 0%, ${passed ? '#10b981' : '#f59e0b'} 100%); color: ${passed ? '#064e3b' : '#78350f'}; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: inline-block;">
            ${passed ? '🎉 CONGRATULATIONS!' : '📚 KEEP LEARNING!'}
          </span>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">

          <!-- Greeting -->
          <div style="margin-bottom: 30px; text-align: center;">
            <h2 style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0 0 10px 0;">Hello ${userName}!</h2>
            <p style="color: #64748b; font-size: 16px; margin: 0;">Thank you for completing the quiz. Here are your results:</p>
          </div>

          <!-- Quiz Results -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px;">📊 Your Results</h3>
            <div style="background: ${passed ? '#f0fdf4' : '#fef3c7'}; border-radius: 12px; padding: 20px; border-left: 4px solid ${passed ? '#22c55e' : '#f59e0b'};">
              <p><strong style="width: 120px; display: inline-block; color: #64748b;">Quiz:</strong> ${quizTitle}</p>
              <p><strong style="width: 120px; display: inline-block; color: #64748b;">Your Score:</strong> <span style="font-size: 18px; font-weight: 700; color: ${passed ? '#16a34a' : '#d97706'};">${totalMarks}/${maxMarks} (${percentage}%)</span></p>
              <p><strong style="width: 120px; display: inline-block; color: #64748b;">Result:</strong> <span style="font-size: 16px; font-weight: 700; color: ${passed ? '#16a34a' : '#d97706'};">${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}</span></p>
            </div>
          </div>

          <!-- Next Steps -->
          <div style="margin-bottom: 30px;">
            <h3 style="color:#1e293b; font-size:20px; font-weight:600; margin:0 0 20px;">🚀 What's Next?</h3>
            <div style="background:#eef2ff; border-radius:12px; padding:20px; border-left:4px solid #6366f1;">
              ${passed ? 
                `<p>🎉 <strong>Congratulations!</strong> You have successfully passed the quiz.</p>
                 <p>📞 Our TechPratham team will contact you soon with the next steps in your learning journey.</p>
                 <p>📧 Keep an eye on your email for further instructions.</p>` :
                `<p>📚 <strong>Don't worry!</strong> Learning is a journey, and every attempt makes you stronger.</p>
                 <p>💪 Review the topics and try again when you're ready.</p>
                 <p>📞 Our team is here to help - we'll reach out to provide additional support.</p>`
              }
            </div>
          </div>

          <!-- Contact Info -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
            <h3 style="color: white; margin: 0 0 10px 0; font-size: 18px;">📞 Need Help?</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">
              Contact us at <strong>techprathamit@gmail.com</strong> or visit our website for more information.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #6b7280; font-size: 13px;">
              Thank you for choosing TechPratham for your learning journey!
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // Send email to student
    const studentEmailResult = await transporter.sendMail({
      from: `"TechPratham" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Quiz Results: ${quizTitle} - ${passed ? 'Congratulations!' : 'Keep Learning!'}`,
      html: studentEmailHtml,
    });

    console.log('Student email sent successfully:', studentEmailResult.messageId);

    // Also send notification to admin
    const adminEmailResult = await transporter.sendMail({
      from: `"TechPratham" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `Quiz Completed: ${userName} - ${quizTitle}`,
      html: `
        <h2>Quiz Completion Notification</h2>
        <p><strong>Student:</strong> ${userName} (${userEmail})</p>
        <p><strong>Quiz:</strong> ${quizTitle}</p>
        <p><strong>Score:</strong> ${totalMarks}/${maxMarks} (${percentage}%)</p>
        <p><strong>Status:</strong> ${passed ? 'PASSED' : 'NOT PASSED'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    console.log('Admin notification sent successfully:', adminEmailResult.messageId);

    return {
      success: true,
      studentEmailId: studentEmailResult.messageId,
      adminEmailId: adminEmailResult.messageId
    };

  } catch (error) {
    console.error('Error sending emails:', error);
    throw error;
  }
}