

import React, { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser, deleteUser, getTasksForUser, createTask, deleteTask } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserRole, Task } from '../../types';
import { PlusCircle, Edit, Trash2, ClipboardList, Loader2, Send } from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { format } from 'date-fns';
// FIX: Switched to default import for locale from date-fns/locale/id.
import id from 'date-fns/locale/id';

const TaskManagementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User;
}> = ({ isOpen, onClose, user }) => {
    const { user: currentUser } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');

    useEffect(() => {
        if (isOpen) {
            const fetchTasks = async () => {
                setLoading(true);
                const userTasks = await getTasksForUser(user.id);
                setTasks(userTasks);
                setLoading(false);
            };
            fetchTasks();
        }
    }, [isOpen, user.id]);
    
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim() || !currentUser) return;
        
        const newTask: Omit<Task, 'id'> = {
            text: newTaskText,
            completed: false,
            assigneeId: user.id,
            assigneeName: user.name,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
            createdAt: new Date(),
        };

        const createdTask = await createTask(newTask, currentUser.id);
        setTasks(prev => [createdTask, ...prev]);
        setNewTaskText('');
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!currentUser) return;
        await deleteTask(taskId, currentUser.id);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tugas Khusus untuk ${user.name}`}>
            <div className="space-y-4 max-h-[60vh] flex flex-col">
                <form onSubmit={handleAddTask} className="flex gap-2">
                    <input
                        type="text"
                        value={newTaskText}
                        onChange={e => setNewTaskText(e.target.value)}
                        placeholder="Ketik tugas baru di sini..."
                        className="flex-grow p-2 border rounded-lg"
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Send size={16} /> Tugaskan
                    </button>
                </form>

                <div className="flex-grow overflow-y-auto pr-2">
                    {loading ? (
                        <div className="text-center p-4"><Loader2 className="animate-spin inline-block"/> Memuat tugas...</div>
                    ) : tasks.length === 0 ? (
                        <p className="text-center text-gray-500 p-4">Belum ada tugas khusus yang ditugaskan.</p>
                    ) : (
                        <ul className="space-y-2">
                            {tasks.map(task => (
                                <li key={task.id} className={`p-3 rounded-lg flex justify-between items-center ${task.completed ? 'bg-green-50 text-gray-500' : 'bg-gray-50'}`}>
                                    <div>
                                        <p className={`${task.completed ? 'line-through' : ''}`}>{task.text}</p>
                                        <p className="text-xs text-gray-400">
                                            Dibuat oleh {task.creatorName} pada {format(task.createdAt, 'd MMM yyyy', { locale: id })}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600">
                                        <Trash2 size={16}/>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [taskModalUser, setTaskModalUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      username: '',
      password: '',
      role: UserRole.Staff,
      asalSekolah: '',
      jurusan: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({ name: '', email: '', username: '', password: '', role: UserRole.Staff, asalSekolah: '', jurusan: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
        name: user.name,
        email: user.email,
        username: user.username || '',
        password: '', // Password is not shown, only updated if changed
        role: user.role,
        asalSekolah: user.asalSekolah || '',
        jurusan: user.jurusan || '',
    });
    setIsModalOpen(true);
  };
  
  const openDeleteModal = (user: User) => {
      setSelectedUser(user);
      setIsConfirmModalOpen(true);
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const dataToSubmit: any = { ...formData };
    if (dataToSubmit.username) {
        dataToSubmit.username = dataToSubmit.username.toLowerCase();
    }
    
    // Only include school/major if the role requires it
    if (formData.role !== UserRole.AnakMagang && formData.role !== UserRole.AnakPKL) {
        dataToSubmit.asalSekolah = '';
        dataToSubmit.jurusan = '';
    }

    if (isEditing && selectedUser) {
        // Exclude password and email from update payload as they are handled separately by Firebase Auth
        const { password, email, ...dataToUpdate } = dataToSubmit;
        await updateUser(selectedUser.id, dataToUpdate, currentUser.id);
    } else {
        await addUser({
            ...dataToSubmit,
        }, currentUser.id);
    }
    setIsModalOpen(false);
    fetchUsers();
  };
  
  const handleDeleteConfirm = async () => {
      if (selectedUser && currentUser) {
          await deleteUser(selectedUser.id, currentUser.id);
          setIsConfirmModalOpen(false);
          setSelectedUser(null);
          fetchUsers();
      }
  }

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manajemen Staf</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlusCircle size={18} />
            Tambah User Baru
        </button>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    {(user.role === UserRole.AnakMagang || user.role === UserRole.AnakPKL) && (
                        <p className="text-gray-500 text-xs mt-1">
                            {user.asalSekolah} ({user.jurusan})
                        </p>
                    )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">{user.email}</td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm">
                  <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${user.role === 'Admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 text-sm flex gap-2">
                  <button onClick={() => openEditModal(user)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="Edit User"><Edit size={16}/></button>
                   <button onClick={() => setTaskModalUser(user)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors" title="Kelola Tugas"><ClipboardList size={16}/></button>
                  {currentUser?.id !== user.id && (
                    <button onClick={() => openDeleteModal(user)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="Hapus User"><Trash2 size={16}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title={isEditing ? 'Edit User' : 'Tambah User Baru'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Form fields */}
              <div>
                  <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"/>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input type="password" placeholder={isEditing ? 'Tidak dapat diubah dari sini' : ''} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} disabled={isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"/>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500">
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                  </select>
              </div>

              {(formData.role === UserRole.AnakMagang || formData.role === UserRole.AnakPKL) && (
                <>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Asal Sekolah/Universitas</label>
                      <input type="text" placeholder="Contoh: SMK Negeri 1 Banjar" value={formData.asalSekolah} onChange={e => setFormData({...formData, asalSekolah: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Jurusan</label>
                      <input type="text" placeholder="Contoh: DKV / Broadcasting" value={formData.jurusan} onChange={e => setFormData({...formData, jurusan: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
          </form>
      </Modal>
      
      {taskModalUser && (
        <TaskManagementModal
            isOpen={!!taskModalUser}
            onClose={() => setTaskModalUser(null)}
            user={taskModalUser}
        />
      )}
      
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus User"
        message={`Apakah Anda yakin ingin menghapus user ${selectedUser?.name}? Akun autentikasi user harus dihapus manual dari Firebase Console.`}
      />
    </div>
  );
};

export default AdminUsersPage;