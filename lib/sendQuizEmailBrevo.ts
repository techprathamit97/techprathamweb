// COMMENTED OUT DUE TO BREVO API COMPATIBILITY ISSUES
// This file is not currently being used in the application

/*
import * as brevo from '@getbrevo/brevo';

export async function sendQuizEmailBrevo(data: any) {
  const {
    userEmail,
    userName,
    quizTitle,
    totalMarks,
    maxMarks,
    percentage,
    passed
  } = data;

  try {
    console.log('=== SENDING EMAIL VIA BREVO ===');
    console.log('To:', userEmail);
    console.log('Subject: Quiz Results -', quizTitle);

    // Initialize Brevo API
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

    // Email content
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${passed ? '#10b981' : '#ef4444'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .result-box { background: ${passed ? '#f0fdf4' : '#fef3c7'}; border-left: 4px solid ${passed ? '#22c55e' : '#f59e0b'}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Quiz Results</h1>
        <p>${quizTitle}</p>
    </div>
    
    <div class="content">
        <h2>Hello ${userName}!</h2>
        <p>Thank you for completing the quiz. Here are your results:</p>
        
        <div class="result-box">
            <h3>📊 Your Results</h3>
            <p><strong>Quiz:</strong> ${quizTitle}</p>
            <p><strong>Score:</strong> <span style="font-size: 18px; font-weight: bold; color: ${passed ? '#16a34a' : '#d97706'};">${totalMarks}/${maxMarks} (${percentage}%)</span></p>
            <p><strong>Result:</strong> <span style="font-weight: bold; color: ${passed ? '#16a34a' : '#d97706'};">${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}</span></p>
        </div>
        
        <div style="background: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 What's Next?</h3>
            ${passed ? 
                '<p>🎉 <strong>Congratulations!</strong> You have successfully passed the quiz.</p><p>📞 Our TechPratham team will contact you soon with the next steps in your learning journey.</p>' :
                '<p>📚 <strong>Don\'t worry!</strong> Learning is a journey, and every attempt makes you stronger.</p><p>💪 Review the topics and try again when you\'re ready.</p><p>📞 Our team is here to help - we\'ll reach out to provide additional support.</p>'
            }
        </div>
        
        <div class="footer">
            <h3>📞 Need Help?</h3>
            <p>Contact us at <strong>techprathamit@gmail.com</strong></p>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 30px;">
            Thank you for choosing TechPratham for your learning journey!<br>
            Completed on: ${new Date().toLocaleString()}
        </p>
    </div>
</body>
</html>
    `;

    // Prepare email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: userEmail, name: userName }];
    sendSmtpEmail.sender = { email: 'noreply@techpratham.com', name: 'TechPratham' };
    sendSmtpEmail.subject = `Quiz Results: ${quizTitle} - ${passed ? 'Congratulations!' : 'Keep Learning!'}`;
    sendSmtpEmail.htmlContent = emailContent;

    // Send email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully via Brevo:', result.response.statusCode);
    
    // Send admin notification
    await sendAdminNotificationBrevo(data);
    
    return {
      success: true,
      service: 'Brevo',
      messageId: result.body?.messageId,
      sentTo: userEmail
    };

  } catch (error) {
    console.error('❌ Brevo email failed:', error);
    
    // Fallback to console logging if email fails
    console.log('📧 FALLBACK - EMAIL CONTENT FOR:', userEmail);
    console.log(`
🎯 QUIZ RESULTS FOR ${userName}

Quiz: ${quizTitle}
Score: ${totalMarks}/${maxMarks} (${percentage}%)
Status: ${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}
Completed: ${new Date().toLocaleString()}

${passed ? 
  '🎉 Congratulations! You have successfully passed the quiz.' :
  '📚 Keep learning! Review the topics and try again when ready.'
}

Contact: techprathamit@gmail.com
    `);
    
    return {
      success: true,
      service: 'Console Log (Fallback)',
      sentTo: userEmail,
      note: 'Email service unavailable, logged to console'
    };
  }
}

async function sendAdminNotificationBrevo(data: any) {
  const {
    userEmail,
    userName,
    quizTitle,
    totalMarks,
    maxMarks,
    percentage,
    passed
  } = data;

  try {
    console.log('=== SENDING ADMIN NOTIFICATION VIA BREVO ===');
    
    // For now, just log the admin notification
    // In production, you would send an actual email
    console.log('✅ Admin notification processed');
    console.log(`
📧 ADMIN NOTIFICATION:

🎯 Quiz Completion Alert
Student: ${userName} (${userEmail})
Quiz: ${quizTitle}
Score: ${totalMarks}/${maxMarks} (${percentage}%)
Status: ${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}
Time: ${new Date().toLocaleString()}

Action Required: Follow up with ${userName}
    `);
    
  } catch (error) {
    console.error('❌ Admin notification failed:', error);
  }
}
*/

// Placeholder export to maintain module structure
export function sendQuizEmailBrevo() {
  throw new Error('Brevo email service is currently disabled due to API compatibility issues');
}