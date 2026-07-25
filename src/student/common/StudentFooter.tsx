import React from 'react';
import Link from 'next/link';

const StudentFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="px-4 py-4 lg:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          {/* Copyright */}
          <div className="text-xs sm:text-sm text-gray-600 order-3 sm:order-1">
            © {currentYear} TechPratham. All rights reserved.
          </div>

          {/* Links - wrap on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 order-1 sm:order-2">
            <Link href="/student/help" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Help
            </Link>
            <Link href="/student/privacy" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Privacy
            </Link>
            <Link href="/student/terms" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Terms
            </Link>
          </div>

          {/* Version */}
          <div className="text-xs text-gray-500 order-2 sm:order-3">
            v1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StudentFooter;
