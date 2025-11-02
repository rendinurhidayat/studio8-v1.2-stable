



import React, { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser, deleteUser, getTasksForUser, createTask, deleteTask, addMentorFeedback, getMentorFeedbackForIntern, updateTask } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserRole, Task, MentorFeedback } from '../../types';
import { PlusCircle, Edit, Trash2, ClipboardList, Loader2, Send, MessageSquare, Star, Eye, Image as ImageIcon } from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
// FIX: Use named imports for date-fns functions
import { format, addDays } from 'date-fns';
import id from 'date-fns/locale/id';
import StarRating from '../../components/feedback/StarRating';
import { fileToBase64 } from '../../utils/fileUtils';

const FeedbackModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    task: Task;
    intern: User;
    existingFeedback: MentorFeedback | null;
}> = ({ isOpen, onClose, task, intern, existingFeedback }) => {
    const { user: currentUser } = useAuth();
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (existingFeedback) {
            setRating(existingFeedback.rating);
            setFeedbackText(existingFeedback.feedback);
        } else {
            setRating(0);
            setFeedbackText('');
        }
    }, [existingFeedback]);

    const handleSubmit = async () => {
        if (!currentUser || rating === 0 || !feedbackText.trim()) {
            alert("Rating and feedback text cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        await addMentorFeedback(intern.id, {
            taskId: task.id,
            taskTitle: task.text,
            feedback: feedbackText,
            rating,
            mentorId: currentUser.id,
            mentorName: currentUser.name,
        });
        setIsSubmitting(false);
        onClose();
    };

    const isViewing = !!existingFeedback;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isViewing ? `Feedback for: ${task.text}` : `Beri Feedback untuk: ${task.text}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Rating</label>
                    <StarRating value={rating} onChange={setRating} isEditable={!isViewing} size={28}/>
                </div>
                <div>
                    <label className="block text-sm font-medium">Komentar Feedback</label>
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} readOnly={isViewing} className="mt-1 w-full p-2 border rounded read-only:bg-gray-100" />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                    {isViewing ? 'Tutup' : 'Batal'}
                </button>
                {!isViewing && (
                    <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Kirim Feedback'}
                    </button>
                )}
            </div>
        </Modal>
    );
};


const TaskManagementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: User;
}> = ({ isOpen, onClose, user }) => {
    const { user: currentUser } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mentorFeedbacks, setMentorFeedbacks] = useState<MentorFeedback[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [feedbackModalState, setFeedbackModalState] = useState<{isOpen: boolean, task: Task | null, feedback: MentorFeedback | null}>({isOpen: false, task: null, feedback: null});

    const fetchTasksAndFeedback = async () => {
        setLoading(true);
        const [userTasks, userFeedback] = await Promise.all([
            getTasksForUser(user.id),
            getMentorFeedbackForIntern(user.id),
        ]);
        setTasks(userTasks);
        setMentorFeedbacks(userFeedback);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchTasksAndFeedback();
        }
    }, [isOpen, user.id]);
    
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim() || !currentUser) return;
        
        const creationDate = new Date();

        const newTask: Omit<Task, 'id'> = {
            text: newTaskText,
            description: newTaskDescription,
            completed: false,
            assigneeId: user.id,
            assigneeName: user.name,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
            createdAt: creationDate.toISOString(),
            dueDate: dueDate ? new Date(dueDate).toISOString() : addDays(creationDate, 3).toISOString(),
            progress: 0,
        };

        await createTask(newTask, currentUser.id);
        setNewTaskText('');
        setNewTaskDescription('');
        setDueDate('');
        fetchTasksAndFeedback(); // Refresh list
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!currentUser) return;
        await deleteTask(taskId, currentUser.id);
        fetchTasksAndFeedback(); // Refresh list
    };

    const handleToggleTaskCompletion = async (task: Task) => {
        if (!currentUser) return;
        await updateTask(task.id, { completed: !task.completed }, currentUser.id);
        fetchTasksAndFeedback();
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Tugas Khusus untuk ${user.name}`}>
                <div className="space-y-4 max-h-[60vh] flex flex-col">
                    <form onSubmit={handleAddTask} className="space-y-2 p-2 border rounded-lg">
                        <input type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Judul tugas..." className="w-full p-2 border rounded-lg" required />
                        <textarea value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} placeholder="Deskripsi tugas (opsional)..." rows={2} className="w-full p-2 border rounded-lg" />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="p-2 border rounded-lg" />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Send size={16} /> Tugaskan
                            </button>
                        </div>
                    </form>

                    <div className="flex-grow overflow-y-auto pr-2">
                        {loading ? (
                            <div className="text-center p-4"><Loader2 className="animate-spin inline-block"/> Memuat tugas...</div>
                        ) : tasks.length === 0 ? (
                            <p className="text-center text-gray-500 p-4">Belum ada tugas khusus yang ditugaskan.</p>
                        ) : (
                            <ul className="space-y-2">
                                {tasks.map(task => {
                                    const feedback = mentorFeedbacks.find(f => f.taskId === task.id);
                                    return (
                                    <li key={task.id} className={`p-3 rounded-lg flex justify-between items-start ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                                        <div className="flex items-start gap-3 flex-grow">
                                            <input
                                                type="checkbox"
                                                checked={task.completed}
                                                onChange={() => handleToggleTaskCompletion(task)}
                                                className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                                            />
                                            <div>
                                                <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</p>
                                                {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                                                <div className="text-xs text-gray-400 mt-1 space-x-2">
                                                    <span>Dibuat: {format(new Date(task.createdAt), 'd MMM yyyy', { locale: id })}</span>
                                                    {task.dueDate && <span>Tenggat: {format(new Date(task.dueDate), 'd MMM yyyy', { locale: id })}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                                            {task.completed && (
                                                feedback ? (
                                                    <button onClick={() => setFeedbackModalState({isOpen: true, task, feedback})} className="flex items-center gap-1.5 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                                                        <Eye size={14} /> Lihat Feedback
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setFeedbackModalState({isOpen: true, task, feedback: null})} className="flex items-center gap-1.5 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md">
                                                        <MessageSquare size={14} /> Beri Feedback
                                                    </button>
                                                )
                                            )}
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </li>
                                )})}
                            </ul>
                        )}
                    </div>
                </div>
            </Modal>
            {feedbackModalState.task && (
                <FeedbackModal 
                    isOpen={feedbackModalState.isOpen}
                    onClose={() => {
                        setFeedbackModalState({isOpen: false, task: null, feedback: null});
                        fetchTasksAndFeedback(); // Refresh feedback data after modal closes
                    }}
                    task={feedbackModalState.task}
                    intern={user}
                    existingFeedback={feedbackModalState.feedback}
                />
            )}
        </>
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
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
      name: '',
      email: '',
      username: '',
      password: '',
      role: UserRole.Staff,
      photoURL: '',
      asalSekolah: '',
      jurusan: '',
      startDate: '',
      endDate: '',
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

  const resetForm = () => {
    setFormData({ name: '', email: '', username: '', password: '', role: UserRole.Staff, photoURL: '', asalSekolah: '', jurusan: '', startDate: '', endDate: '' });
    setPhotoFile(null);
  }

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
        name: user.name,
        email: user.email,
        username: user.username || '',
        password: '',
        role: user.role,
        photoURL: user.photoURL || '',
        asalSekolah: user.asalSekolah || '',
        jurusan: user.jurusan || '',
        startDate: user.startDate ? format(new Date(user.startDate), 'yyyy-MM-dd') : '',
        endDate: user.endDate ? format(new Date(user.endDate), 'yyyy-MM-dd') : '',
    });
    setPhotoFile(null);
    setIsModalOpen(true);
  };
  
  const openDeleteModal = (user: User) => {
      setSelectedUser(user);
      setIsConfirmModalOpen(true);
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
        let finalPhotoUrl = isEditing ? selectedUser?.photoURL || '' : '';
        if (photoFile) {
            const base64 = await fileToBase64(photoFile, { maxWidth: 512, maxHeight: 512 });
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'profile_pictures' })
            });
            if (!response.ok) throw new Error('Gagal mengunggah foto profil.');
            const result = await response.json();
            finalPhotoUrl = result.secure_url;
        }

        const dataToSubmit: any = { ...formData, photoURL: finalPhotoUrl };
        if (dataToSubmit.username) {
            dataToSubmit.username = dataToSubmit.username.toLowerCase();
        }
        
        if (formData.role !== UserRole.AnakMagang && formData.role !== UserRole.AnakPKL) {
            dataToSubmit.asalSekolah = '';
            dataToSubmit.jurusan = '';
            dataToSubmit.startDate = '';
            dataToSubmit.endDate = '';
        } else {
            dataToSubmit.startDate = formData.startDate ? new Date(formData.startDate).toISOString() : undefined;
            dataToSubmit.endDate = formData.endDate ? new Date(formData.endDate).toISOString() : undefined;
        }

        if (isEditing && selectedUser) {
            const { password, email, ...dataToUpdate } = dataToSubmit;
            await updateUser(selectedUser.id, dataToUpdate, currentUser.id);
        } else {
            const finalData = { ...dataToSubmit };
            if (finalData.role === UserRole.AnakMagang || finalData.role === UserRole.AnakPKL) {
                finalData.totalPoints = 0;
            }
            await addUser(finalData, currentUser.id);
        }
        setIsModalOpen(false);
        fetchUsers();
    } catch (error) {
        console.error("Error submitting user form:", error);
        alert((error as Error).message);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteConfirm = async () => {
      if (selectedUser && currentUser) {
          const success = await deleteUser(selectedUser.id, currentUser.id);
          if (success) {
              setIsConfirmModalOpen(false);
              setSelectedUser(null);
              fetchUsers();
          }
      }
  }

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manajemen Staf & Magang</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors">
            <PlusCircle size={18} />
            Tambah User Baru
        </button>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead className="bg-base-100">
            <tr>
              <th className="px-5 py-3 border-b-2 border-base-200 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 border-b-2 border-base-200 text-left text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 border-b-2 border-base-200 text-left text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
              <th className="px-5 py-3 border-b-2 border-base-200 text-left text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-base-100/50">
                <td className="px-5 py-5 border-b border-base-200 text-sm">
                    <div className="flex items-center gap-3">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover"/>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center font-bold text-primary flex-shrink-0">{user.name.charAt(0)}</div>
                        )}
                        <div>
                            <p className="font-medium text-base-content">{user.name}</p>
                            {(user.role === UserRole.AnakMagang || user.role === UserRole.AnakPKL) && (
                                <p className="text-muted text-xs mt-1">
                                    {user.asalSekolah} ({user.jurusan})
                                </p>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-5 py-5 border-b border-base-200 text-sm">{user.email}</td>
                <td className="px-5 py-5 border-b border-base-200 text-sm">
                  <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${user.role === 'Admin' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-base-200 text-sm flex gap-2">
                  <button onClick={() => openEditModal(user)} className="p-2 text-muted hover:text-accent hover:bg-base-200 rounded-full transition-colors" title="Edit User"><Edit size={16}/></button>
                   <button onClick={() => setTaskModalUser(user)} className="p-2 text-muted hover:text-indigo-600 hover:bg-base-200 rounded-full transition-colors" title="Kelola Tugas"><ClipboardList size={16}/></button>
                  {currentUser?.id !== user.id && (
                    <button onClick={() => openDeleteModal(user)} className="p-2 text-muted hover:text-error hover:bg-base-200 rounded-full transition-colors" title="Hapus User"><Trash2 size={16}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title={isEditing ? 'Edit User' : 'Tambah User Baru'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Foto Profil</label>
                  <div className="mt-2 flex items-center gap-4">
                        {formData.photoURL ? (
                            <img src={formData.photoURL} alt="Preview" className="w-16 h-16 rounded-full object-cover"/>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400"><ImageIcon size={32} /></div>
                        )}
                        <div>
                            <label htmlFor="photo-upload" className="cursor-pointer text-sm font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary/20">
                                Pilih Foto
                            </label>
                            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                   <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                            <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"/>
                        </div>
                   </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
                  <button type="submit" disabled={isSaving} className="w-28 flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}
                  </button>
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
        title="Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus pengguna ${selectedUser?.name}? Akun dan data pengguna akan dihapus secara permanen.`}
      />
    </div>
  );
};

export default AdminUsersPage;