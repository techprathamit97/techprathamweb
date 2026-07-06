import { NextRequest, NextResponse } from "next/server";

function formatTrainingDate(date: any): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Get parameters from URL
  const studentName = searchParams.get('name') || 'Student Name';
  const courseName = searchParams.get('course') || 'Course Name';
  // Generate unique certificate ID in format TP + 5 digits + 2 letters (e.g., TP1977BZ)
  const generateCertificateId = () => {
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `TP${timestamp}${random}`;
  };

  const certificateId = searchParams.get('id') || generateCertificateId();
  const print = searchParams.get('print') === 'true';
  
  // Generate completion date (today)
  const completionDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Generate start date (3 months ago)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - ${studentName}</title>
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
      background: linear-gradient(to bottom, #ff0000, #1f1e1f);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
      font-weight: bold;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 30px;
      text-shadow: none;
      margin-top: -50px;
      font-family: 'Noto Serif Ethiopic Condensed', serif;
    }
    .award-text {
      font-size: 24px;
      background: linear-gradient(to bottom, #ff0000, #1f1e1f);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
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
      background: linear-gradient(to bottom, #ff0000, #1f1e1f);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
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
    .action-buttons {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.3s ease;
    }
    .btn-print {
      background: #4CAF50;
      color: white;
    }
    .btn-print:hover {
      background: #45a049;
    }
    .btn-download {
      background: #2196F3;
      color: white;
    }
    .btn-download:hover {
      background: #1976D2;
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
      .action-buttons {
        display: none;
      }
    }
    @page {
      size: landscape;
      margin: 0;
    }
    @media (max-width: 768px) {
      .certificate-container {
        width: 100%;
        height: auto;
        min-height: 500px;
      }
      .course-title {
        font-size: 24px;
        letter-spacing: 2px;
      }
      .student-name {
        font-size: 24px;
        min-width: 250px;
      }
      .description {
        font-size: 12px;
        line-height: 1.6;
      }
      .award-text {
        font-size: 16px;
      }
    }
    .download-section {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1001;
      display: flex;
      gap: 15px;
    }
    .download-btn {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .download-btn:hover {
      background: linear-gradient(135deg, #45a049, #3d8b40);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    .download-btn.print-btn {
      background: linear-gradient(135deg, #2196F3, #1976D2);
    }
    .download-btn.print-btn:hover {
      background: linear-gradient(135deg, #1976D2, #1565C0);
    }
    @media print {
      .action-buttons, .download-section {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-buttons">
    <button onclick="window.print()" class="btn btn-print">
      🖨️ Print Certificate
    </button>
    <a href="javascript:void(0)" onclick="downloadCertificate()" class="btn btn-download">
      💾 Download PDF
    </a>
  </div>

  <div class="certificate-container">
    <div class="certificate-overlay">
      <div class="header-info">
        Date: ${completionDate}<br>
        Certificate id: ${certificateId}
      </div>

      <div class="course-title">${courseName.toUpperCase()}</div>
      
      <div class="award-text">This Certificate is awarded to</div>

      <div class="student-name">${studentName}</div>

      <div class="description">
        This is to certified that the above named student has successfully completed the training for the<br>
        <strong>${courseName}</strong>, conducted by the Techpratham from <strong>${formatTrainingDate(startDate)}</strong> to <strong>${formatTrainingDate(new Date())}</strong><br>
        During this training organisation found him/her, a good performer & an excellent learner
      </div>

      <div class="signature-area">
        <div class="signature-line"></div>
        <div>Director's Signature</div>
      </div>
    </div>
  </div>

  <!-- Download Section -->
  <div class="download-section">
    <button onclick="downloadHighQuality()" class="download-btn">
      📥 Download High Quality
    </button>
    <button onclick="window.print()" class="download-btn print-btn">
      🖨️ Print Certificate
    </button>
  </div>

  <script>
    async function downloadHighQuality() {
      try {
        // Hide download buttons temporarily
        const downloadSection = document.querySelector('.download-section');
        const actionButtons = document.querySelector('.action-buttons');
        if (downloadSection) downloadSection.style.display = 'none';
        if (actionButtons) actionButtons.style.display = 'none';
        
        // Wait a moment for the UI to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use html2canvas to capture high quality image
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = async function() {
          const certificate = document.querySelector('.certificate-container');
          
          try {
            const canvas = await html2canvas(certificate, {
              scale: 3, // High quality scaling
              useCORS: true,
              allowTaint: true,
              backgroundColor: null,
              width: 1024,
              height: 700,
              scrollX: 0,
              scrollY: 0
            });
            
            // Convert to high quality JPEG
            const dataURL = canvas.toDataURL('image/jpeg', 0.95);
            
            // Create download link
            const link = document.createElement('a');
            link.download = 'certificate-${certificateId}-hq.jpg';
            link.href = dataURL;
            link.click();
            
          } catch (error) {
            console.error('High quality download failed:', error);
            // Fallback to print
            window.print();
          }
          
          // Show buttons again
          if (downloadSection) downloadSection.style.display = 'flex';
          if (actionButtons) actionButtons.style.display = 'flex';
        };
        
        script.onerror = function() {
          console.error('Failed to load html2canvas library');
          // Fallback to print
          window.print();
          if (downloadSection) downloadSection.style.display = 'flex';
          if (actionButtons) actionButtons.style.display = 'flex';
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        console.error('Download error:', error);
        // Fallback to print dialog
        window.print();
      }
    }

    function downloadCertificate() {
      // Call the high quality download function
      downloadHighQuality();
    }

    // Auto-print functionality
    window.onload = function() {
      ${print ? 'setTimeout(() => { window.print(); }, 1000);' : ''}
    };
  </script>
</body>
</html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  });
}