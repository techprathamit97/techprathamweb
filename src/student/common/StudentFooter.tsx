import React from 'react';
import Link from 'next/link';

const StudentFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-sm text-gray-600">
            © {currentYear} TechPratham. All rights reserved.
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link href="/student/help" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Help & Support
            </Link>
            <Link href="/student/privacy" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/student/terms" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
          </div>

          {/* Version */}
          <div className="text-xs text-gray-500">
            Version 1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StudentFooter;
