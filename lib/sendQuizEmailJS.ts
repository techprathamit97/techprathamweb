import emailjs from '@emailjs/nodejs';

export async function sendQuizEmailJS(data: any) {
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
    // EmailJS configuration (you'll need to set these up)
    const serviceId = process.env.EMAILJS_SERVICE_ID || 'service_xyz';
    const templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_xyz';
    const publicKey = process.env.EMAILJS_PUBLIC_KEY || 'your_public_key';
    const privateKey = process.env.EMAILJS_PRIVATE_KEY || 'your_private_key';

    // Initialize EmailJS
    emailjs.init({
      publicKey: publicKey,
      privateKey: privateKey,
    });

    // Send email to student
    const emailParams = {
      to_email: userEmail,
      to_name: userName,
      quiz_title: quizTitle,
      total_marks: totalMarks,
      max_marks: maxMarks,
      percentage: percentage,
      status: passed ? 'PASSED' : 'NOT PASSED',
      status_emoji: passed ? '🎉' : '📚',
      message: passed 
        ? 'Congratulations! You have successfully passed the quiz. Our TechPratham team will contact you soon with the next steps.'
        : 'Don\'t worry! Learning is a journey. Review the topics and try again when you\'re ready. Our team will reach out to provide additional support.',
      completion_date: new Date().toLocaleString(),
    };

    const result = await emailjs.send(serviceId, templateId, emailParams);
    
    console.log('EmailJS result:', result);
    return { success: true, result };

  } catch (error) {
    console.error('EmailJS error:', error);
    throw error;
  }
}