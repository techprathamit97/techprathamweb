import React from 'react';

interface CertificatePreviewProps {
  certificate?: {
    studentName?: string;
    courseName?: string;
    certificateId?: string;
    completionDate?: string | Date;
    startDate?: string | Date;
    endDate?: string | Date;
  };
  isMobile?: boolean;
  className?: string;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({ 
  certificate, 
  isMobile = false, 
  className = "" 
}) => {
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTrainingDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Generate unique certificate ID in format TP####BZ
  const generateCertificateId = () => {
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substr(2, 2).toUpperCase();
    const numberPart = timestamp.slice(-2) + randomPart;
    return `TP${numberPart}BZ`;
  };

  const certificateData = {
    studentName: certificate?.studentName || 'Student Name',
    courseName: certificate?.courseName || 'Course Name',
    certificateId: certificate?.certificateId || generateCertificateId(),
    completionDate: formatDate(certificate?.completionDate),
    trainingStartDate: formatTrainingDate(certificate?.startDate),
    trainingEndDate: formatTrainingDate(certificate?.endDate || certificate?.completionDate)
  };

  return (
    <div className={`bg-white p-5 rounded-lg space-y-2 ${className}`}>
      <h3 className="font-semibold">Certificate Preview</h3>
      
      <div className={`${isMobile ? "" : "border-2"} relative overflow-hidden group`}>
        {/* Certificate Template Image */}
        <img 
          src="/course/crt.jpeg" 
          alt="Certificate Template" 
          className="w-full rounded"
        />
        
        {/* Date and Certificate ID Overlay (Top Left) */}
        <div className={`absolute ${isMobile ? "top-[4%] left-[6%]" : "top-[4.5%] left-[5%]"} text-white z-20`}>
          <div className={`${isMobile ? "text-xs" : "text-sm"} font-bold leading-tight`}>
            Date: {certificateData.completionDate}<br/>
            Certificate id: {certificateData.certificateId}
          </div>
        </div>

        {/* Course Name Overlay (Center Top) */}
        <div className={`absolute ${isMobile ? "top-[39%]" : "top-[38%]"} left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 ${isMobile ? "max-w-[85%]" : ""}`}>
          <div 
            className={`text-transparent bg-gradient-to-b from-[#ff0000] to-[#1f1e1f] bg-clip-text ${
              isMobile 
                ? "text-lg sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis" 
                : "text-lg md:text-2xl lg:text-3xl uppercase whitespace-nowrap"
            } font-bold tracking-wide drop-shadow-sm`}
            style={{ fontFamily: "Noto Serif Ethiopic Condensed, serif" }}
          >
            {certificateData.courseName.toUpperCase()}
          </div>
        </div>

        {/* Award Text Overlay */}
        <div className={`absolute ${isMobile ? "top-[48%]" : "top-[47%]"} left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20`}>
          <div 
            className={`text-transparent bg-gradient-to-b from-[#ff0000] to-[#1f1e1f] bg-clip-text ${
              isMobile ? "text-sm" : "text-lg md:text-xl"
            } font-semibold italic`}
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            This Certificate is awarded to
          </div>
        </div>

        {/* Student Name Overlay (Center) */}
        <div className={`absolute ${isMobile ? "top-[58%]" : "top-[57%]"} left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 ${isMobile ? "max-w-[85%]" : "max-w-[70%]"}`}>
          <div 
            className={`text-black ${
              isMobile 
                ? "text-xl font-bold border-b-2 border-black pb-1" 
                : "text-2xl md:text-3xl lg:text-4xl font-bold border-b-3 border-black pb-2"
            } whitespace-nowrap overflow-hidden text-ellipsis`}
            style={{ fontFamily: "Alice, serif" }}
          >
            {certificateData.studentName}
          </div>
        </div>

        {/* Description Text Overlay */}
        <div className={`absolute ${isMobile ? "top-[68%]" : "top-[67%]"} left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 ${isMobile ? "max-w-[90%]" : "max-w-[85%]"}`}>
          <div 
            className={`text-transparent bg-gradient-to-b from-[#ff0000] to-[#1f1e1f] bg-clip-text ${
              isMobile ? "text-xs leading-tight" : "text-sm md:text-base leading-relaxed"
            } text-center`}
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            This is to certified that the above named student has successfully completed the training for the<br/>
            <strong>{certificateData.courseName}</strong>, conducted by the Techpratham from <strong>{certificateData.trainingStartDate}</strong> to <strong>{certificateData.trainingEndDate}</strong><br/>
            During this training organisation found him/her, a good performer & an excellent learner
          </div>
        </div>

        {/* Signature Area Overlay (Bottom Left) */}
        <div className={`absolute ${isMobile ? "bottom-[15%] left-[8%]" : "bottom-[17%] left-[8%]"} z-20`}>
          <div className={`${isMobile ? "text-xs" : "text-sm"} font-bold text-gray-800`}>
            <div className={`${isMobile ? "w-24 h-0.5" : "w-32 h-0.5"} bg-gray-800 mb-1`}></div>
            Director's Signature
          </div>
        </div>

        {/* Hover Effect for Interactive Preview */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 z-10"></div>
      </div>

      {/* Certificate Actions */}
      <div className="flex gap-2 mt-3">
        <button 
          onClick={() => window.open(`/api/lms/certificates/preview?name=${encodeURIComponent(certificateData.studentName)}&course=${encodeURIComponent(certificateData.courseName)}&id=${certificateData.certificateId}`, '_blank')}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          📄 View Full Certificate
        </button>
        <button 
          onClick={() => window.open(`/api/lms/certificates/preview?name=${encodeURIComponent(certificateData.studentName)}&course=${encodeURIComponent(certificateData.courseName)}&id=${certificateData.certificateId}&print=true`, '_blank')}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          🖨️ Print Certificate
        </button>
      </div>
    </div>
  );
};

export default CertificatePreview;