import React, { useState, useEffect } from 'react';
import { getClients } from '../../services/api';
import { Client } from '../../types';
import { Award } from 'lucide-react';

const AdminClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const data = await getClients();
      setClients(data);
      setLoading(false);
    };
    fetchClients();
  }, []);

  if (loading) return <div>Loading client data...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Data Klien</h1>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Klien</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kontak</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tier Loyalitas</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Poin</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kode Referral</th>
               <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-5 py-5 border-b border-gray-200 text-sm font-medium text-gray-900">{client.name}</td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                    <p className="text-gray-800 whitespace-no-wrap">{client.email}</p>
                    <p className="text-gray-600 whitespace-no-wrap">{client.phone}</p>
                </td>
                 <td className="px-5 py-5 border-b border-gray-200 text-sm text-center">
                    {client.loyaltyTier ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                           <Award size={14}/> {client.loyaltyTier}
                        </span>
                    ) : (
                        <span className="text-gray-500 text-xs">Regular</span>
                    )}
                 </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-center font-semibold">{client.loyaltyPoints || 0}</td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm font-mono text-blue-600">{client.referralCode}</td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-gray-600">{client.lastBooking.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClientsPage;