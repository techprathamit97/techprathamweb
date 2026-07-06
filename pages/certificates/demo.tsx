import React from 'react';
import CertificateExample from '@/components/certificates/CertificateExample';

const CertificateDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎓 TechPratham Certificate System
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Dynamic certificate generation using your custom template. 
            Perfect overlay positioning with real-time preview and print functionality.
          </p>
        </div>

        {/* Certificate Demo */}
        <CertificateExample />

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-lg font-semibold mb-2">Custom Template</h3>
            <p className="text-gray-600 text-sm">
              Uses your exact certificate template image with precise text overlay positioning
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
            <p className="text-gray-600 text-sm">
              Optimized for both desktop and mobile viewing with adaptive text sizing
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-3xl mb-3">🖨️</div>
            <h3 className="text-lg font-semibold mb-2">Print Ready</h3>
            <p className="text-gray-600 text-sm">
              Professional print layout with proper page settings and print-optimized styling
            </p>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">🔧 Integration Guide</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">1. Import the Component:</h4>
              <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                {`import CertificatePreview from '@/components/certificates/CertificatePreview';`}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">2. Use in Your Component:</h4>
              <div className="bg-gray-100 p-3 rounded font-mono text-xs">
{`<CertificatePreview 
  certificate={{
    studentName: "John Doe",
    courseName: "React Development",
    certificateId: "TP123456",
    completionDate: "2026-06-17"
  }}
  isMobile={false}
/>`}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">3. API Endpoints:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li><code className="bg-gray-200 px-1 rounded">/api/lms/certificates/preview</code> - Dynamic preview (no database)</li>
                <li><code className="bg-gray-200 px-1 rounded">/api/lms/certificates/[id]/download</code> - Database certificate</li>
                <li><code className="bg-gray-200 px-1 rounded">/api/debug/test-certificate</code> - Test endpoint</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Certificate template: <code>/public/course/crt.jpeg</code></p>
          <p>Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
};

export default CertificateDemo;