import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Certificate from "@/models/Certificate.js";

function formatTrainingDate(date: any): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Generate unique certificate ID in format TP + 5 digits + 2 letters (e.g., TP1977BZ)
function generateCertificateId(): string {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `TP${timestamp}${random}`;
}

// Generate HTML certificate using the template image
function generateCertificateHTML(certificate: any): string {
  const completionDate = certificate.completionDate
    ? new Date(certificate.completionDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

  const certificateId = certificate.certificateId || certificate.certificateNo || generateCertificateId();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - ${certificate.studentName}</title>
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
      width: 860px;
      height: 600px;
      background: url('/course/certifcate.jpeg') center/contain no-repeat;
      position: relative;
    
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
      padding: 40px;
    }
    .header-info {
      position: absolute;
      top: 20px;
      left: 15px;
      color: white;
      font-size: 12px;
      text-align: left;
      line-height: 1.6;
    }
    
    /* SVG-based gradient that works with html2canvas */
    .course-title {
      font-size: 40px;
      font-weight: bold;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-top: 110px;
      font-family: 'Noto Serif Ethiopic Condensed', serif;
      fill: url(#gradient);
      color: #ff0000; /* Fallback */
    }
    
    .course-title-svg {
      width: 100%;
      height: 60px;
      overflow: visible;
    }
    
    .course-title-text {
      font-size: 40px;
      font-weight: bold;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: 'Noto Serif Ethiopic Condensed', serif;
      text-anchor: middle;
      dominant-baseline: middle;
    }
    
    .student-name {
      font-size: 30px;
      color: #000000;
      font-weight: bold;
      margin-top: 50px;
      padding-bottom: 8px;
      border-bottom: 3px solid #000000;
      display: inline-block;
      min-width: 300px;
      font-family: 'Alice', serif;
    }
    .description {
      font-size: 18px;
      color: red;
      line-height: 1.5;
      max-width: 700px;
      margin: 10px auto;
      text-align: justify;
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
    .print-styles {
      display: none;
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
      .print-styles {
        display: block;
      }
    }
    @page {
      size: landscape;
      margin: 0;
    }
    .download-section {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
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
    @media print {
      .download-section {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- SVG Gradient Definition -->
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1f1e1f;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
    
    <div class="certificate-overlay">
      <div class="header-info">
        Date: ${completionDate}<br>
        Certificate Id: ${certificateId}
      </div>

      <!-- SVG Course Title with Gradient -->
      <div style="margin-top: 110px;">
        <svg class="course-title-svg" viewBox="0 0 600 60">
          <defs>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1f1e1f;stop-opacity:1" />
            </linearGradient>
          </defs>
          <text class="course-title-text" x="300" y="30" fill="url(#textGradient)">
            ${(certificate.courseName || 'WORKDAY HCM TRAINING').toUpperCase()}
          </text>
        </svg>
      </div>

      <div class="student-name">${certificate.studentName || 'Student Name'}</div>

      <div class="description">
        This is to certified that the above named student has successfully completed the training for the
        <strong>${certificate.courseName || 'Course Training'}</strong>, conducted by the Techpratham from <strong>${formatTrainingDate(certificate.startDate)}</strong> to <strong>${formatTrainingDate(certificate.endDate || certificate.completionDate)}</strong>
        During this training organisation found him/her, a good performer & an excellent learner
      </div>

      
    </div>
  </div>

  <!-- Download Section -->
  <div class="download-section">
    <button onclick="downloadHighQuality()" class="download-btn">
      📥 Download
    </button>
  </div>

  <script>
    async function downloadHighQuality() {
      try {
        // Hide download buttons temporarily
        const downloadSection = document.querySelector('.download-section');
        downloadSection.style.display = 'none';
        
        // Wait for fonts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
              width: 860,
              height: 600,
              scrollX: 0,
              scrollY: 0,
              logging: false,
              foreignObjectRendering: false
            });
            
            // Convert to high quality PNG
            const dataURL = canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.download = 'certificate-${certificateId}-hq.png';
            link.href = dataURL;
            link.click();
            
          } catch (error) {
            console.error('High quality download failed:', error);
            alert('Failed to generate certificate. Please try again.');
          }
          
          // Show download buttons again
          downloadSection.style.display = 'flex';
        };
        
        script.onerror = function() {
          console.error('Failed to load html2canvas library');
          alert('Failed to load download library. Please try again.');
          downloadSection.style.display = 'flex';
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to generate certificate. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();

    const { id } = await params;
    const url = new URL(req.url);
    const print = url.searchParams.get('print') === 'true';

    const certificate = await Certificate.findById(id);

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    if (certificate.status !== 'issued') {
      return NextResponse.json(
        { error: "Certificate is not issued yet" },
        { status: 400 }
      );
    }

    // Generate HTML certificate using template
    const htmlContent = generateCertificateHTML(certificate);

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error("Certificate download error:", error);
    return NextResponse.json(
      { error: "Failed to download certificate" },
      { status: 500 }
    );
  }
}