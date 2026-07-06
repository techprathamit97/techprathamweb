import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const payment = await Payment.findById(id).lean();

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Generate invoice HTML for printing
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${payment.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; }
    .invoice-title { font-size: 28px; color: #333; margin: 10px 0; }
    .invoice-number { font-size: 18px; color: #666; }
    .details { margin: 20px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details th, .details td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    .details th { background-color: #f5f5f5; }
    .amount-section { margin-top: 30px; }
    .amount-section table { width: 100%; border-collapse: collapse; }
    .amount-section td { padding: 8px; }
    .total-row { font-size: 18px; font-weight: bold; background-color: #f5f5f5; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 4px; font-weight: bold; }
    .status.completed { background-color: #d4edda; color: #155724; }
    .status.partial { background-color: #fff3cd; color: #856404; }
    .status.pending { background-color: #f8d7da; color: #721c24; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">TechPratham</div>
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">${payment.invoiceNumber}</div>
  </div>

  <div class="details">
    <table>
      <tr>
        <th colspan="2">Student Information</th>
      </tr>
      <tr>
        <td><strong>Name:</strong> ${payment.studentName}</td>
        <td><strong>Email:</strong> ${payment.studentEmail}</td>
      </tr>
      <tr>
        <td><strong>Invoice Date:</strong> ${new Date(payment.invoiceDate).toLocaleDateString()}</td>
        <td><strong>Payment Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</td>
      </tr>
    </table>
  </div>

  <div class="details">
    <table>
      <tr>
        <th colspan="2">Course Details</th>
      </tr>
      <tr>
        <td><strong>Course:</strong> ${payment.courseName}</td>
        <td><strong>Installment:</strong> #${payment.installmentNumber}</td>
      </tr>
      <tr>
        <td><strong>Payment Method:</strong> ${payment.paymentSource}</td>
        <td><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</td>
      </tr>
    </table>
  </div>

  <div class="amount-section">
    <table>
      <tr>
        <td>Total Course Fees</td>
        <td style="text-align: right;">₹${payment.totalFees.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Amount Paid</td>
        <td style="text-align: right;">₹${payment.paidAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Previous Payments</td>
        <td style="text-align: right;">₹${payment.previousPaidAmount.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td>Remaining Due</td>
        <td style="text-align: right;">₹${payment.dueAmount.toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top: 20px;">
    <strong>Status:</strong>
    <span class="status ${payment.paymentStatus}">${payment.paymentStatus.toUpperCase()}</span>
  </div>

  ${payment.remarks ? `<div style="margin-top: 20px;"><strong>Remarks:</strong> ${payment.remarks}</div>` : ''}

  <div class="footer">
    <p>Thank you for your payment!</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    return NextResponse.json({
      success: true,
      data: {
        payment,
        invoiceHtml
      }
    });
  } catch (error: any) {
    console.error('Invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice', message: error.message },
      { status: 500 }
    );
  }
}