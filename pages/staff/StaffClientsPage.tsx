

import React, { useState, useEffect } from 'react';
import { getClients } from '../../services/api';
import { Client } from '../../types';
import Modal from '../../components/common/Modal';
import { User, Mail, Phone, ShoppingBag, BarChart2 } from 'lucide-react';

const ClientDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}> = ({ isOpen, onClose, client }) => {
    if (!client) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client.name}>
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail size={18} className="text-slate-500"/>
                    <span className="text-sm text-slate-700">{client.email}</span>
                </div>
                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone size={18} className="text-slate-500"/>
                    <span className="text-sm text-slate-700">{client.phone}</span>
                </div>
                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <ShoppingBag size={18} className="text-slate-500"/>
                    <span className="text-sm text-slate-700">{client.totalBookings} Total Booking</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <BarChart2 size={18} className="text-slate-500"/>
                    <span className="text-sm text-slate-700">Rp {client.totalSpent.toLocaleString('id-ID')} Total Transaksi</span>
                </div>
            </div>
        </Modal>
    );
}


const StaffClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const data = await getClients();
      setClients(data);
      setLoading(false);
    };
    fetchClients();
  }, []);

  if (loading) return <div className="text-center p-8 text-slate-500">Memuat data klien...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Data Klien</h1>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200">
        <table className="min-w-full leading-normal">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Klien</th>
              <th className="px-5 py-3 border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kontak</th>
              <th className="px-5 py-3 border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Booking</th>
              <th className="px-5 py-3 border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClient(client)}>
                <td className="px-5 py-5 border-b border-slate-200 text-sm font-medium text-blue-700">{client.name}</td>
                <td className="px-5 py-5 border-b border-slate-200 text-sm">
                    <p className="text-slate-800 whitespace-no-wrap">{client.email}</p>
                    <p className="text-slate-600 whitespace-no-wrap text-xs">{client.phone}</p>
                </td>
                <td className="px-5 py-5 border-b border-slate-200 text-sm text-center font-semibold text-slate-700">{client.totalBookings}</td>
                <td className="px-5 py-5 border-b border-slate-200 text-sm text-slate-600">{new Date(client.lastBooking).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ClientDetailModal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} client={selectedClient}/>
    </div>
  );
};

export default StaffClientsPage;