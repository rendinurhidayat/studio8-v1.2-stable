
import React, { useState, useEffect } from 'react';
import { getClients, deleteClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Client } from '../../types';
import { Award, Trash2 } from 'lucide-react';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const AdminClientsPage = () => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const handleDeleteConfirm = async () => {
    if (clientToDelete && currentUser) {
      await deleteClient(clientToDelete.id, currentUser.id);
      setClientToDelete(null);
      fetchClients();
    }
  };

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
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking Terakhir</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
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
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-gray-600">{new Date(client.lastBooking).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm text-center">
                    <button onClick={() => handleDeleteClick(client)} className="p-2 text-muted hover:text-error hover:bg-base-200 rounded-full transition-colors" title="Hapus Klien">
                        <Trash2 size={16}/>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <ConfirmationModal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Klien"
        message={`Apakah Anda yakin ingin menghapus data klien "${clientToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
};

export default AdminClientsPage;