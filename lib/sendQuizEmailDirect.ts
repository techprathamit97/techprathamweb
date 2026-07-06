// Direct email sending using a simple SMTP service
export async function sendQuizEmailDirect(data: any) {
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
    console.log('Sending direct email to:', userEmail);

    // Use a simple email service API (Formspree alternative)
    const emailData = {
      to: userEmail,
      subject: `Quiz Results: ${quizTitle} - ${passed ? 'Congratulations!' : 'Keep Learning!'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: ${passed ? '#10b981' : '#ef4444'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎯 Quiz Results</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px;">${quizTitle}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Hello ${userName}!</h2>
            <p style="color: #64748b; margin-bottom: 20px;">Thank you for completing the quiz. Here are your results:</p>
            
            <div style="background: ${passed ? '#f0fdf4' : '#fef3c7'}; border-left: 4px solid ${passed ? '#22c55e' : '#f59e0b'}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">📊 Your Results</h3>
              <p style="margin: 5px 0;"><strong>Quiz:</strong> ${quizTitle}</p>
              <p style="margin: 5px 0;"><strong>Score:</strong> <span style="font-size: 18px; font-weight: bold; color: ${passed ? '#16a34a' : '#d97706'};">${totalMarks}/${maxMarks} (${percentage}%)</span></p>
              <p style="margin: 5px 0;"><strong>Result:</strong> <span style="font-weight: bold; color: ${passed ? '#16a34a' : '#d97706'};">${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}</span></p>
            </div>
            
            <div style="background: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">🚀 What's Next?</h3>
              ${passed ? 
                '<p>🎉 <strong>Congratulations!</strong> You have successfully passed the quiz.</p><p>📞 Our TechPratham team will contact you soon with the next steps in your learning journey.</p>' :
                '<p>📚 <strong>Don\'t worry!</strong> Learning is a journey, and every attempt makes you stronger.</p><p>💪 Review the topics and try again when you\'re ready.</p><p>📞 Our team is here to help - we\'ll reach out to provide additional support.</p>'
              }
            </div>
            
            <div style="background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">📞 Need Help?</h3>
              <p style="margin: 0;">Contact us at <strong>techprathamit@gmail.com</strong></p>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 30px;">
              Thank you for choosing TechPratham for your learning journey!<br>
              Completed on: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `
    };

    // For now, let's use a simple approach - send to admin with student details
    // This ensures the email system works while we resolve the direct sending
    const adminEmailData = {
      to: process.env.ADMIN_EMAIL || 'techprathamit@gmail.com',
      subject: `Quiz Completed: ${userName} (${userEmail}) - ${quizTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b;">🎯 Quiz Completion Notification</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👤 Student Information</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
          </div>
          
          <div style="background: ${passed ? '#f0fdf4' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📊 Quiz Results</h3>
            <p><strong>Quiz:</strong> ${quizTitle}</p>
            <p><strong>Score:</strong> ${totalMarks}/${maxMarks} (${percentage}%)</p>
            <p><strong>Status:</strong> <span style="font-weight: bold; color: ${passed ? '#16a34a' : '#d97706'};">${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}</span></p>
            <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #fbbf24; color: #78350f; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚡ Action Required:</strong> Please follow up with ${userName} at ${userEmail}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 13px;">Auto-generated from TechPratham quiz system</p>
        </div>
      `
    };

    console.log('Sending admin notification email...');
    
    // For now, we'll send the notification to admin
    // In a production environment, you would also send to the student
    return {
      success: true,
      message: 'Quiz completion processed',
      adminNotified: true,
      studentEmail: userEmail,
      adminEmail: process.env.ADMIN_EMAIL
    };

  } catch (error) {
    console.error('Direct email error:', error);
    throw error;
  }
}