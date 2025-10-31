import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCertificateById } from '../../services/api';
import { Certificate } from '../../types';
import { Loader2, CheckCircle, XCircle, Home, Award, User, Calendar, UserCheck } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

const CertificateValidationPage = () => {
    const { id: certificateId } = useParams<{ id: string }>();
    const [certificate, setCertificate] = useState<Certificate | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!certificateId) {
            setCertificate(null);
            setLoading(false);
            return;
        }

        const fetchCertificate = async () => {
            setLoading(true);
            const data = await getCertificateById(certificateId);
            setCertificate(data);
            setLoading(false);
        };
        fetchCertificate();
    }, [certificateId]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted">Memverifikasi sertifikat...</p>
                </div>
            );
        }

        if (certificate) {
            return (
                <div className="text-center">
                    <CheckCircle size={64} className="text-success mx-auto" />
                    <h1 className="mt-4 text-3xl font-bold text-success">Sertifikat Valid</h1>
                    <p className="mt-2 text-muted">Sertifikat ini terverifikasi dan dikeluarkan secara resmi oleh Studio 8.</p>

                    <div className="mt-8 text-left bg-base-100 p-6 rounded-2xl border border-base-200 space-y-4">
                        <div className="flex items-center gap-4">
                            <Award className="w-6 h-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted">ID Sertifikat</p>
                                <p className="font-semibold text-primary font-mono">{certificate.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <User className="w-6 h-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted">Nama</p>
                                <p className="font-semibold text-primary">{certificate.studentName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Calendar className="w-6 h-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted">Periode</p>
                                <p className="font-semibold text-primary">{certificate.period}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4">
                            <Calendar className="w-6 h-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted">Tanggal Terbit</p>
                                <p className="font-semibold text-primary">{format(new Date(certificate.issuedDate), 'd MMMM yyyy', { locale: id })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <UserCheck className="w-6 h-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted">Disahkan oleh</p>
                                <p className="font-semibold text-primary">{certificate.mentor}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center">
                <XCircle size={64} className="text-error mx-auto" />
                <h1 className="mt-4 text-3xl font-bold text-error">Sertifikat Tidak Valid</h1>
                <p className="mt-2 text-muted">Sertifikat dengan ID ini tidak ditemukan di sistem kami. Mohon periksa kembali.</p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary">STUDIO <span className="text-accent">8</span></h1>
                    <p className="text-muted">Verifikasi Keaslian Sertifikat</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-xl border">
                    {renderContent()}
                </div>
                <div className="mt-8 text-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
                        <Home size={16} />
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CertificateValidationPage;