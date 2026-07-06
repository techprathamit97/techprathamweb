'use client';

import React from 'react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceTemplateProps {
  invoice: {
    invoiceNumber: string;
    receiptNo: string;
    invoiceDate: string;
    customerDetails: {
      name: string;
      email: string;
      phone: string;
      studentId: string;
    };
    courseDetails: {
      title: string;
      category: string;
      level: string;
    };
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    feeType: string;
    paymentMode?: string;
    dueDate?: string;
    paidDate?: string;
    installmentDates?: Array<{
      installmentNumber: number;
      dueDate: string;
      amount: number;
    }>;
    isManual?: boolean;
  };
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto" id="invoice-template">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center">
          <div className="bg-gray-800 text-white p-4 rounded-lg mr-4">
            <div className="text-2xl font-bold">tp</div>
            <div className="text-xs">tech pratham</div>
            <div className="text-xs">Technology First</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="bg-red-600 text-white px-6 py-2 rounded-l-full mb-2">
            <h1 className="text-2xl font-bold">FEE RECEIPT</h1>
          </div>
          <div className="text-sm">
            <div><strong>Receipt No:</strong> {invoice.receiptNo}</div>
            <div><strong>Receipt Date:</strong> {formatDate(invoice.invoiceDate)}</div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="text-sm text-gray-600 mb-6">
        <div>📍 Noida, Uttar Pradesh 201301</div>
        <div>📞 +91-8882786865</div>
        <div>✉️ accounts@techpratham.com</div>
      </div>

      {/* Receipt To */}
      <div className="mb-6">
        <h3 className="text-red-600 font-bold mb-2">RECEIPT TO:</h3>
        <h2 className="text-2xl font-bold mb-4">{invoice.customerDetails.name}</h2>
        
        <div className="grid grid-cols-3 gap-4 bg-gray-100 p-4 rounded">
          <div>
            <div className="text-xs text-gray-600">MAIL ID</div>
            <div className="font-medium">{invoice.customerDetails.email}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Course</div>
            <div className="font-medium">{invoice.courseDetails.title}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Fees Type</div>
            <div className="font-medium">{invoice.feeType || 'Full Payment'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Mobile Number</div>
            <div className="font-medium">{invoice.customerDetails.phone}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Student Id</div>
            <div className="font-medium">{invoice.customerDetails.studentId || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Payment Mode</div>
            <div className="font-medium">{invoice.paymentMode?.replace('_', ' ').toUpperCase() || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Invoice Type</div>
            <div className="font-medium">{invoice.isManual ? 'Manual Entry' : 'From Enrollment'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Next Due Date</div>
            <div className="font-medium">
              {invoice.feeType === 'Full Payment' ? 'N/A' : (invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Paid Date</div>
            <div className="font-medium">{invoice.paidDate ? formatDate(invoice.paidDate) : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-red-600 text-white">
              <th className="border border-gray-300 p-3 text-left">Pay Components</th>
              <th className="border border-gray-300 p-3 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="bg-gray-50">
                <td className="border border-gray-300 p-3">{item.description}</td>
                <td className="border border-gray-300 p-3 text-right font-bold">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100">
              <td className="border border-gray-300 p-3 font-bold">Net Amount</td>
              <td className="border border-gray-300 p-3 text-right font-bold">
                {formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 p-3 font-bold">Amount Paid</td>
              <td className="border border-gray-300 p-3 text-right font-bold">
                {formatCurrency(invoice.paidAmount || 0)}
              </td>
            </tr>
            {invoice.pendingAmount > 0 && (
              <tr className="bg-gray-100">
                <td className="border border-gray-300 p-3 font-bold">Balance Due</td>
                <td className="border border-gray-300 p-3 text-right font-bold">
                  {formatCurrency(invoice.pendingAmount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Installment Schedule */}
      {invoice.installmentDates && invoice.installmentDates.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold mb-2 text-red-600">Installment Schedule:</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="border border-gray-300 p-2 text-left">Installment</th>
                <th className="border border-gray-300 p-2 text-center">Due Date</th>
                <th className="border border-gray-300 p-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.installmentDates.map((installment, index) => (
                <tr key={index} className="bg-gray-50">
                  <td className="border border-gray-300 p-2">Installment {installment.installmentNumber}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {formatDate(installment.dueDate)}
                  </td>
                  <td className="border border-gray-300 p-2 text-right font-bold">
                    {formatCurrency(installment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature */}
      <div className="mb-6">
        <div className="font-bold">Bharat sahai</div>
        <div className="text-sm text-gray-600">Authorised Signature</div>
      </div>

      {/* Terms */}
      <div className="mb-6">
        <h4 className="font-bold mb-2">Terms & Conditions:</h4>
        <div className="text-sm text-gray-600">
          <div>Fee Once Paid will not be Refunded Back in Any Case</div>
          <div>This is E-Invoice, Signature Not Required For any query pls write us <span className="text-blue-600">accounts@techpratham.com</span></div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <div className="flex items-center justify-center mb-2">
          <div className="bg-gray-800 text-white p-2 rounded mr-2">
            <div className="text-sm font-bold">tp</div>
          </div>
          <div className="text-sm text-gray-600">tech pratham</div>
        </div>
        <div className="text-lg font-bold text-gray-800">Thank you!</div>
        <div className="text-sm text-gray-600">for with joining us</div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;