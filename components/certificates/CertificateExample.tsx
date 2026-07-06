import React, { useState } from 'react';
import CertificatePreview from './CertificatePreview';

const CertificateExample: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [certificate, setCertificate] = useState({
    studentName: 'Nikki Roumel',
    courseName: 'Workday HCM Training',
    certificateId: 'TP1977BZ', // Example format
    completionDate: '2026-01-27',
    startDate: '2025-10-06'
  });

  const handleInputChange = (field: string, value: string) => {
    setCertificate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🎓 Certificate Generator</h2>
        <p className="text-gray-600 mb-6">Generate and preview certificates using your custom template</p>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
            <input
              type="text"
              value={certificate.studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
            <input
              type="text"
              value={certificate.courseName}
              onChange={(e) => handleInputChange('courseName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter course name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificate ID</label>
            <input
              type="text"
              value={certificate.certificateId}
              onChange={(e) => handleInputChange('certificateId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter certificate ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Completion Date</label>
            <input
              type="date"
              value={certificate.completionDate}
              onChange={(e) => handleInputChange('completionDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isMobile}
              onChange={(e) => setIsMobile(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Mobile View</span>
          </label>
        </div>
      </div>

      {/* Certificate Preview */}
      <CertificatePreview 
        certificate={certificate}
        isMobile={isMobile}
      />

      {/* API Examples */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 API Usage Examples</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-blue-700">Preview URL:</strong>
            <div className="bg-white p-2 rounded mt-1 font-mono text-xs break-all">
              /api/lms/certificates/preview?name={encodeURIComponent(certificate.studentName)}&course={encodeURIComponent(certificate.courseName)}&id={certificate.certificateId}
            </div>
          </div>
          <div>
            <strong className="text-blue-700">Print URL:</strong>
            <div className="bg-white p-2 rounded mt-1 font-mono text-xs break-all">
              /api/lms/certificates/preview?name={encodeURIComponent(certificate.studentName)}&course={encodeURIComponent(certificate.courseName)}&id={certificate.certificateId}&print=true
            </div>
          </div>
          <div>
            <strong className="text-blue-700">Database Certificate:</strong>
            <div className="bg-white p-2 rounded mt-1 font-mono text-xs">
              /api/lms/certificates/[certificateId]/download
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <a 
            href={`/api/lms/certificates/preview?name=${encodeURIComponent(certificate.studentName)}&course=${encodeURIComponent(certificate.courseName)}&id=${certificate.certificateId}`}
            target="_blank"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            🔗 Open Preview API
          </a>
          <a 
            href="/api/debug/test-certificate"
            target="_blank"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            🧪 Test Certificate
          </a>
        </div>
      </div>
    </div>
  );
};

export default CertificateExample;