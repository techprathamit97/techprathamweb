import { NextResponse } from "next/server";

export async function GET() {
  // Generate unique certificate ID in format TP + 5 digits + 2 letters (e.g., TP1977BZ)
  const generateCertificateId = () => {
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `TP${timestamp}${random}`;
  };

  // Create a sample certificate for testing
  const sampleCertificate = {
    _id: '6a324b2a968c6808b30f8b45',
    studentName: 'Nikki Roumel',
    courseName: 'Workday HCM Training',
    certificateId: generateCertificateId(),
    certificateNo: generateCertificateId(),
    completionDate: new Date('2026-01-27'),
    startDate: new Date('2025-10-06'),
    issueDate: new Date('2026-02-12'),
    grade: 'A',
    score: 95,
    status: 'issued'
  };

  function formatTrainingDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  const completionDate = new Date(sampleCertificate.completionDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - ${sampleCertificate.studentName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alice&family=Noto+Serif+Ethiopic:wght@100..900&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .certificate-container {
      width: 1024px;
      height: 700px;
      background: url('/course/crt.jpeg') center/cover no-repeat;
      position: relative;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .certificate-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 50px;
    }
    .header-info {
      position: absolute;
      top: 30px;
      left: 50px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-align: left;
      line-height: 1.6;
    }
    .course-title {
      font-size: 48px;
      color: #ff0000 !important;
      font-weight: bold;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      margin-top: -50px;
      font-family: 'Noto Serif Ethiopic Condensed', serif;
      -webkit-text-fill-color: #ff0000 !important;
      background: none !important;
    }
    .award-text {
      font-size: 24px;
      color: #8B0000 !important;
      font-style: italic;
      margin-bottom: 30px;
      font-family: 'Times New Roman', serif;
      -webkit-text-fill-color: #8B0000 !important;
      background: none !important;
    }
    .student-name {
      font-size: 40px;
      color: #000000;
      font-weight: bold;
      margin: 30px 0;
      padding-bottom: 8px;
      border-bottom: 3px solid #000000;
      display: inline-block;
      min-width: 400px;
      font-family: 'Alice', serif;
    }
    .description {
      font-size: 16px;
      color: #8B0000 !important;
      line-height: 1.8;
      max-width: 700px;
      margin: 30px auto;
      text-align: center;
      font-family: 'Times New Roman', serif;
      -webkit-text-fill-color: #8B0000 !important;
      background: none !important;
    }
    .award-text {
      font-size: 24px;
      color: #8B0000;
      font-style: italic;
      margin-bottom: 30px;
      font-family: 'Times New Roman', serif;
    }
    .student-name {
      font-size: 40px;
      color: #000000;
      font-weight: bold;
      margin: 30px 0;
      padding-bottom: 8px;
      border-bottom: 3px solid #000000;
      display: inline-block;
      min-width: 400px;
      font-family: 'Alice', serif;
    }
    .description {
      font-size: 16px;
      color: #8B0000;
      line-height: 1.8;
      max-width: 700px;
      margin: 30px auto;
      text-align: center;
      font-family: 'Times New Roman', serif;
    }
    .signature-area {
      position: absolute;
      bottom: 120px;
      left: 80px;
      color: #333;
      font-size: 16px;
      font-weight: bold;
    }
    .signature-line {
      width: 200px;
      height: 2px;
      background: #333;
      margin: 40px 0 10px 0;
    }
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .certificate-container {
        width: 100vw;
        height: 100vh;
        box-shadow: none;
        border-radius: 0;
        max-width: none;
        max-height: none;
      }
    }
    @page {
      size: landscape;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="certificate-overlay">
      <div class="header-info">
        Date: ${completionDate}<br>
        Certificate id: ${sampleCertificate.certificateId}
      </div>

      <div class="course-title">JAVA</div>
      
      <div class="award-text">This Certificate is awarded to</div>

      <div class="student-name">${sampleCertificate.studentName}</div>

      <div class="description">
        This is to certified that the above named student has successfully completed the training for the<br>
        <strong>JAVA</strong>, conducted by the Techpratham from <strong>${formatTrainingDate(sampleCertificate.startDate)}</strong> to <strong>${formatTrainingDate(sampleCertificate.completionDate)}</strong><br>
        During this training organisation found him/her, a good performer & an excellent learner
      </div>

      <div class="signature-area">
        <div class="signature-line"></div>
        <div>Director's Signature</div>
      </div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px;">
    <button onclick="downloadHighQuality()" style="padding: 10px 20px; background: #FF6B35; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
      📱 Download High Quality
    </button>
    <a href="/api/lms/certificates/6a324b2a968c6808b30f8b45/download" target="_blank" style="padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
      📄 View Original API
    </a>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script>
    async function downloadHighQuality() {
      try {
        // Wait a bit for fonts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const certificateElement = document.querySelector('.certificate-container');
        const canvas = await html2canvas(certificateElement, {
          scale: 3, // High quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          width: 1024,
          height: 700,
          logging: false,
          foreignObjectRendering: false,
          ignoreElements: function(element) {
            // Ignore any gradient elements that might cause issues
            return element.classList && element.classList.contains('ignore-in-download');
          }
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'certificate-${sampleCertificate.certificateId}.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('Error generating certificate:', error);
        alert('Failed to generate certificate. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}