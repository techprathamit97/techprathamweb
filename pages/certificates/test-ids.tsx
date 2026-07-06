import React, { useState } from 'react';
import { generateCertificateId, validateCertificateId, getCertificatePreviewUrl } from '@/utils/certificateUtils';

const TestCertificateIds: React.FC = () => {
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [testId, setTestId] = useState('');
  const [validationResult, setValidationResult] = useState<boolean | null>(null);

  const generateNewId = () => {
    const newId = generateCertificateId();
    setGeneratedIds(prev => [newId, ...prev.slice(0, 9)]); // Keep last 10 IDs
  };

  const handleValidateId = () => {
    const isValid = validateCertificateId(testId);
    setValidationResult(isValid);
  };

  const sampleCertificate = {
    studentName: 'John Doe',
    courseName: 'React Development'
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎫 Certificate ID Generator & Validator
          </h1>
          <p className="text-gray-600 mb-8">
            Test the unique certificate ID generation system. Format: <code className="bg-gray-100 px-2 py-1 rounded">TP####BZ</code>
          </p>

          {/* ID Generator Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🔄 Generate New Certificate IDs</h2>
            <div className="flex gap-4 items-center mb-4">
              <button
                onClick={generateNewId}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Generate New ID
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < 5; i++) {
                    setTimeout(() => generateNewId(), i * 100);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Generate 5 IDs
              </button>
              <button
                onClick={() => setGeneratedIds([])}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Clear All
              </button>
            </div>

            {generatedIds.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Generated Certificate IDs:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {generatedIds.map((id, index) => (
                    <div key={index} className="bg-white p-3 rounded border text-center">
                      <code className="font-mono font-bold text-blue-600">{id}</code>
                      <div className="mt-2">
                        <a
                          href={getCertificatePreviewUrl({
                            ...sampleCertificate,
                            certificateId: id
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          Preview
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ID Validator Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">✅ Validate Certificate ID Format</h2>
            <div className="flex gap-4 items-center mb-4">
              <input
                type="text"
                value={testId}
                onChange={(e) => {
                  setTestId(e.target.value.toUpperCase());
                  setValidationResult(null);
                }}
                placeholder="Enter certificate ID (e.g., TP1977BZ)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleValidateId}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Validate
              </button>
            </div>

            {validationResult !== null && (
              <div className={`p-4 rounded-lg ${validationResult ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${validationResult ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult ? '✅' : '❌'}
                  </span>
                  <span className={`font-semibold ${validationResult ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult ? 'Valid Certificate ID Format' : 'Invalid Certificate ID Format'}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${validationResult ? 'text-green-700' : 'text-red-700'}`}>
                  {validationResult 
                    ? 'This certificate ID follows the correct TP####BZ format.'
                    : 'Certificate ID must follow the format: TP + 4 alphanumeric characters + BZ'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Format Explanation */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Certificate ID Format</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-2 py-1 rounded font-mono">TP</code>
                <span>→ TechPratham prefix (fixed)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-2 py-1 rounded font-mono">####</code>
                <span>→ 4-character unique identifier (timestamp + random)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-2 py-1 rounded font-mono">BZ</code>
                <span>→ Suffix identifier (fixed)</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <strong className="text-blue-800">Example IDs:</strong>
              <div className="mt-2 flex flex-wrap gap-2">
                {['TP1977BZ', 'TP2845BZ', 'TP3621BZ', 'TP4789BZ', 'TP5643BZ'].map(id => (
                  <code key={id} className="bg-white px-2 py-1 rounded font-mono text-blue-600">{id}</code>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 flex gap-4 flex-wrap">
            <a
              href="/certificates/demo"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🎓 Certificate Demo
            </a>
            <a
              href="/api/debug/test-certificate"
              target="_blank"
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🧪 Test Certificate
            </a>
            <a
              href="/api/lms/certificates/preview?name=Sample Student&course=Test Course"
              target="_blank"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📄 Preview API
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCertificateIds;