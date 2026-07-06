// Fallback email system using Web3Forms when SMTP is not configured
export async function sendQuizEmailFallback(data: any) {
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
    console.log('=== SENDING EMAIL VIA WEB3FORMS ===');
    console.log('To:', userEmail);
    console.log('Subject: Quiz Results -', quizTitle);

    // Prepare email content
    const emailContent = `
Dear ${userName},

🎯 QUIZ COMPLETION RESULTS

Thank you for completing the "${quizTitle}" quiz!

📊 YOUR RESULTS:
• Score: ${totalMarks}/${maxMarks} (${percentage}%)
• Status: ${passed ? '✅ PASSED' : '❌ NOT PASSED'}

${passed ? 
  '🎉 Congratulations! You have successfully passed the quiz.\n\n📞 Our TechPratham team will contact you soon with the next steps in your learning journey.\n\n📧 Keep an eye on your email for further instructions.' :
  '📚 Don\'t worry! Learning is a journey, and every attempt makes you stronger.\n\n💪 Review the topics and try again when you\'re ready.\n\n📞 Our team is here to help - we\'ll reach out to provide additional support.'
}

📞 Need Help?
Contact us at techprathamit@gmail.com or visit our website for more information.

Thank you for choosing TechPratham for your learning journey!

Best regards,
TechPratham Team
Completed on: ${new Date().toLocaleString()}

---
This is an automated email from TechPratham Quiz System.
    `;

    // Send via Web3Forms
    const formData = new FormData();
    formData.append('access_key', process.env.WEB3FORMS_ACCESS_KEY || '');
    formData.append('email', userEmail);
    formData.append('name', userName);
    formData.append('subject', `Quiz Results: ${quizTitle} - ${passed ? 'Congratulations!' : 'Keep Learning!'}`);
    formData.append('message', emailContent);
    formData.append('from_name', 'TechPratham');
    formData.append('from_email', 'techprathamit@gmail.com');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email sent successfully via Web3Forms to:', userEmail);
      
      // Also send admin notification
      await sendAdminNotificationFallback(data);
      
      return {
        success: true,
        service: 'Web3Forms',
        sentTo: userEmail,
        adminNotified: true
      };
    } else {
      throw new Error(`Web3Forms error: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Web3Forms email sending failed:', error);
    throw error;
  }
}

async function sendAdminNotificationFallback(data: any) {
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
    console.log('=== SENDING ADMIN NOTIFICATION VIA WEB3FORMS ===');
    
    const adminContent = `
🎯 QUIZ COMPLETION NOTIFICATION

👤 Student Information:
• Name: ${userName}
• Email: ${userEmail}

📊 Quiz Results:
• Quiz: ${quizTitle}
• Score: ${totalMarks}/${maxMarks} (${percentage}%)
• Status: ${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}
• Completed: ${new Date().toLocaleString()}

⚡ Action Required:
Please follow up with ${userName} at ${userEmail}

${passed ? 
  '🎉 Student has passed - contact for next steps.' :
  '📚 Student needs support - provide additional guidance.'
}
    `;

    const formData = new FormData();
    formData.append('access_key', process.env.WEB3FORMS_ACCESS_KEY || '');
    formData.append('email', process.env.ADMIN_EMAIL || 'techprathamit@gmail.com');
    formData.append('name', 'TechPratham Quiz System');
    formData.append('subject', `Quiz Completed: ${userName} - ${quizTitle}`);
    formData.append('message', adminContent);
    formData.append('from_name', 'TechPratham Quiz System');
    formData.append('from_email', 'noreply@techpratham.com');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Admin notification sent successfully via Web3Forms');
    } else {
      console.error('❌ Admin notification failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Admin notification failed:', error);
  }
}