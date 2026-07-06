// Simple email sending using Web3Forms (free service)
export async function sendQuizEmailSimple(data: any) {
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
    console.log('Sending email via Web3Forms to:', userEmail);
    console.log('Access Key:', process.env.WEB3FORMS_ACCESS_KEY);

    // Prepare email data as JSON
    const emailData = {
      access_key: process.env.WEB3FORMS_ACCESS_KEY,
      subject: `Quiz Results: ${quizTitle} - ${passed ? 'Congratulations!' : 'Keep Learning!'}`,
      email: userEmail,
      name: userName,
      message: `Dear ${userName},

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
Completed on: ${new Date().toLocaleString()}`
    };

    console.log('Sending email with data:', emailData);

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    console.log('Web3Forms response:', result);
    
    if (result.success) {
      console.log('✅ Student email sent successfully via Web3Forms');
      
      // Also send admin notification
      await sendAdminNotification(data);
      
      return { success: true, service: 'Web3Forms', result };
    } else {
      throw new Error(`Web3Forms error: ${result.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Simple email error:', error);
    throw error;
  }
}

async function sendAdminNotification(data: any) {
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
    const adminEmailData = {
      access_key: process.env.WEB3FORMS_ACCESS_KEY,
      subject: `Quiz Completed: ${userName} - ${quizTitle}`,
      email: process.env.ADMIN_EMAIL || 'techprathamit@gmail.com',
      name: 'TechPratham System',
      message: `🎯 QUIZ COMPLETION NOTIFICATION

👤 Student Information:
• Name: ${userName}
• Email: ${userEmail}

📊 Quiz Results:
• Quiz: ${quizTitle}
• Score: ${totalMarks}/${maxMarks} (${percentage}%)
• Status: ${passed ? 'PASSED ✅' : 'NOT PASSED ❌'}
• Completed: ${new Date().toLocaleString()}

⚡ Action Required:
Please follow up with ${userName} regarding their quiz performance.

${passed ? 
  '🎉 Student has passed - contact for next steps.' :
  '📚 Student needs support - provide additional guidance.'
}`
    };

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminEmailData)
    });

    const result = await response.json();
    console.log('Admin notification result:', result);
    
  } catch (error) {
    console.error('Admin notification error:', error);
  }
}