
import React, { useState, useEffect, useMemo } from 'react';
import { getActivityLogs, getUsers } from '../../services/api';
import { ActivityLog, User, UserRole } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import id from 'date-fns/locale/id';
import { Edit, Trash2, PlusCircle, CheckCircle, Settings, Download, Filter, X, User as UserIcon } from 'lucide-react';
import { exportToCSV } from '../../utils/export';

const ICONS: { [key: string]: React.ReactNode } = {
    'mengubah': <Edit className="h-5 w-5 text-blue-500" />,
    'menghapus': <Trash2 className="h-5 w-5 text-red-500" />,
    'membuat': <PlusCircle className="h-5 w-5 text-green-500" />,
    'menambah': <PlusCircle className="h-5 w-5 text-green-500" />,
    'mengonfirmasi': <CheckCircle className="h-5 w-5 text-teal-500" />,
    'menyelesaikan': <CheckCircle className="h-5 w-5 text-green-600" />,
    'memperbarui': <Settings className="h-5 w-5 text-gray-500" />,
    'default': <UserIcon className="h-5 w-5 text-gray-400" />,
};

const getIconForAction = (action: string) => {
    const lowerCaseAction = action.toLowerCase();
    for (const keyword in ICONS) {
        if (lowerCaseAction.startsWith(keyword)) {
            return ICONS[keyword];
        }
    }
    return ICONS['default'];
};

const AdminActivityLogPage = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [logsData, usersData] = await Promise.all([
                getActivityLogs(),
                getUsers(),
            ]);
            setLogs(logsData);
            setUsers(usersData.filter(u => Object.values(UserRole).includes(u.role)));
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredLogs = useMemo(() => {
        if (filterUser === 'all') {
            return logs;
        }
        return logs.filter(log => log.userId === filterUser);
    }, [logs, filterUser]);

    const handleExport = () => {
        const dataToExport = filteredLogs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString('id-ID'),
            'User': log.userName,
            'Action': log.action,
            'Details': log.details,
        }));
        exportToCSV(dataToExport, `activity-log-${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Log Aktivitas Sistem</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <select
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="all">Semua User</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        {filterUser !== 'all' && <button onClick={() => setFilterUser('all')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold">
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
                {loading ? (
                    <p className="text-center text-gray-500">Memuat log...</p>
                ) : filteredLogs.length === 0 ? (
                    <p className="text-center text-gray-500">Tidak ada aktivitas yang tercatat.</p>
                ) : (
                    <div className="flow-root">
                        <ul className="-mb-8">
                            {filteredLogs.map((log, logIdx) => (
                                <li key={log.id}>
                                    <div className="relative pb-8">
                                        {logIdx !== filteredLogs.length - 1 ? (
                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex space-x-3">
                                            <div>
                                                <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                                    {getIconForAction(log.action)}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-semibold text-gray-900">{log.action}</span>
                                                    {log.details && <span className="text-gray-600"> - {log.details}</span>}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    oleh <span className="font-medium">{log.userName}</span> &bull; {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: id })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminActivityLogPage;