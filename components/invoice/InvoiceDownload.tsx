'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface InvoiceDownloadProps {
  invoiceId: string;
  invoiceNumber: string;
  onDownload?: () => void;
  onPrint?: () => void;
}

const InvoiceDownload: React.FC<InvoiceDownloadProps> = ({
  invoiceId,
  invoiceNumber,
  onDownload,
  onPrint
}) => {
  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const element = document.getElementById('invoice-template');
      if (!element) {
        throw new Error('Invoice template not found');
      }

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`invoice-${invoiceNumber}.pdf`);
      
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('invoice-template');
    if (!element) {
      alert('Invoice template not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    if (onPrint) {
      onPrint();
    }
  };

  return (
    <div className="flex gap-2 no-print">
      <Button
        onClick={handleDownloadPDF}
        className="flex items-center gap-2"
        variant="default"
      >
        < Download className="w-4 h-4" />
        Download PDF
      </Button>
      
      <Button
        onClick={handlePrint}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Printer className="w-4 h-4" />
        Print
      </Button>
    </div>
  );
};

export default InvoiceDownload;