
import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { Booking } from '../../types';
import { Download, Loader2, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { generateGoogleCalendarLink } from '../../utils/calendar';

declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

const PrintStyles = () => (
  <style>
    {`
      @media print {
        body * {
          visibility: hidden;
        }
        .no-print, .no-print * {
          display: none !important;
        }
        .invoice-print-area, .invoice-print-area * {
          visibility: visible;
        }
        .invoice-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .invoice-print-area p,
        .invoice-print-area span,
        .invoice-print-area td,
        .invoice-print-area th,
        .invoice-print-area h1,
        .invoice-print-area h2,
        .invoice-print-area div {
          color: #000000 !important;
          background-color: transparent !important;
        }
        .invoice-print-area hr {
          border-color: #cccccc !important;
        }
        .invoice-print-area .text-green-700 { color: #047857 !important; }
        .invoice-print-area .text-red-700 { color: #b91c1c !important; }
        .invoice-print-area .text-primary { color: #0a1a2f !important; }
        .invoice-print-area .text-accent { color: #3b82f6 !important; }
      }
    `}
  </style>
);


const InvoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
}> = ({ isOpen, onClose, booking }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        if (!booking || !invoiceRef.current) return;
        setIsDownloading(true);
        try {
            const { jsPDF } = window.jspdf;
            const canvas = await window.html2canvas(invoiceRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${booking.bookingCode}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Gagal membuat PDF. Silakan coba lagi.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleSendWhatsApp = () => {
        if (!booking) return;
        const phone = booking.clientPhone.replace('+', '');
        const message = `
Halo ${booking.clientName},

Terima kasih telah memesan sesi di Studio 8!
Berikut adalah detail invoice untuk booking Anda:

*Kode Booking:* ${booking.bookingCode}
*Jadwal:* ${new Date(booking.bookingDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} jam ${new Date(booking.bookingDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}

*Rincian:*
- Paket ${booking.package.name} (${booking.selectedSubPackage.name}): Rp ${booking.selectedSubPackage.price.toLocaleString('id-ID')}
${booking.selectedSubAddOns.map(sa => `- ${sa.name}: Rp ${sa.price.toLocaleString('id-ID')}`).join('\n')}
${(booking.extraPersonCharge || 0) > 0 ? `- Biaya Tambahan Orang: Rp ${booking.extraPersonCharge!.toLocaleString('id-ID')}` : ''}
${booking.discountAmount ? `\n*Diskon (${booking.discountReason}):* -Rp ${booking.discountAmount.toLocaleString('id-ID')}` : ''}

*Total Biaya:* Rp ${booking.totalPrice.toLocaleString('id-ID')}
*DP Dibayar:* Rp ${(booking.totalPrice + (booking.discountAmount || 0) - booking.remainingBalance).toLocaleString('id-ID')}
*Sisa Pembayaran:* Rp ${booking.remainingBalance.toLocaleString('id-ID')}

Sisa pembayaran dapat dilunasi di studio saat sesi foto.
Kami tunggu kedatangannya!

Salam,
Studio 8
        `.trim();
        
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    if (!booking) return null;
    
    const subtotal = booking.totalPrice + (booking.discountAmount || 0);
    const dpPaid = subtotal - booking.remainingBalance;
    const gCalLink = generateGoogleCalendarLink(booking);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Invoice: ${booking.bookingCode}`}>
            <PrintStyles />
            <div ref={invoiceRef} className="invoice-print-area p-6 bg-white text-black font-sans text-sm">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold">INVOICE</h1>
                        <p className="mt-1">Kode Booking: <span className="font-mono">{booking.bookingCode}</span></p>
                    </div>
                    <div className="text-right">
                         <h2 className="text-2xl font-bold text-primary">Studio <span className="text-accent">8</span></h2>
                        <p>Depan SMK 4 Banjar, Pataruman, Banjar</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 my-6">
                    <div>
                        <p className="font-bold">Ditagihkan Kepada:</p>
                        <p>{booking.clientName}</p>
                        <p>{booking.clientEmail}</p>
                        <p>{booking.clientPhone}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-bold">Tanggal Invoice:</span> {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                        <p><span className="font-bold">Tanggal Sesi:</span> {new Date(booking.bookingDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                    </div>
                </div>
                <table className="w-full text-left mb-6">
                    <thead>
                        <tr className="border-b-2">
                            <th className="p-2 font-bold">Deskripsi</th>
                            <th className="p-2 text-right font-bold">Harga</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2">
                                <p className="font-semibold">{booking.package.name} ({booking.selectedSubPackage.name})</p>
                                <p className="text-xs">{new Date(booking.bookingDate).toLocaleDateString('id-ID', { weekday: 'long', day:'numeric', month:'long', year:'numeric', timeZone: 'Asia/Jakarta' })}</p>
                            </td>
                            <td className="p-2 text-right">Rp {booking.selectedSubPackage.price.toLocaleString('id-ID')}</td>
                        </tr>
                         {booking.selectedSubAddOns.map(sa => (
                             <tr key={sa.id} className="border-b">
                                <td className="p-2 pl-6 text-xs">+ {sa.name}</td>
                                <td className="p-2 text-right">Rp {sa.price.toLocaleString('id-ID')}</td>
                            </tr>
                         ))}
                         {(booking.extraPersonCharge || 0) > 0 && (
                            <tr className="border-b">
                                <td className="p-2 pl-6 text-xs">+ Biaya Tambahan Orang</td>
                                <td className="p-2 text-right">Rp {booking.extraPersonCharge!.toLocaleString('id-ID')}</td>
                            </tr>
                         )}
                    </tbody>
                </table>
                 <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                         <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span></div>
                          {booking.discountAmount && booking.discountAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="font-medium text-blue-700">Diskon ({booking.discountReason})</span>
                                <span className="font-semibold text-blue-700">- Rp {booking.discountAmount.toLocaleString('id-ID')}</span>
                            </div>
                         )}
                         <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>Rp {booking.totalPrice.toLocaleString('id-ID')}</span></div>
                         <div className="flex justify-between"><span className="font-medium text-green-700">DP Dibayar</span><span className="font-semibold text-green-700">- Rp {dpPaid.toLocaleString('id-ID')}</span></div>
                         <hr className="border-dashed"/>
                         <div className="flex justify-between font-bold text-lg pt-1 text-red-700"><span>Sisa Bayar</span><span>Rp {booking.remainingBalance.toLocaleString('id-ID')}</span></div>
                    </div>
                </div>
                <div className="text-xs text-center mt-12 pt-4 border-t">
                    <p className="font-semibold">Terima kasih telah memilih Studio 8!</p>
                    <p>Sisa pembayaran dilunasi di studio sebelum sesi dimulai.</p>
                </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-4 no-print">
                <a href={gCalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <CalendarIcon size={16}/> Add to Google Calendar
                </a>
                <button type="button" onClick={handleSendWhatsApp} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-green-100 rounded-lg hover:bg-green-200">
                    <MessageSquare size={16}/> Kirim ke WhatsApp
                </button>
                <button 
                    type="button" 
                    onClick={handleDownloadPdf} 
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 w-40"
                >
                    {isDownloading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Memproses...
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            Download PDF
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default InvoiceModal;