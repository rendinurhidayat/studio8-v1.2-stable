
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserRole, ChatRoom, ChatMessage } from '../../types';
import { getUsers, getChatRoomsForUser, getMessagesStream, sendMessage, findOrCreateChatRoom } from '../../services/api';
import { Loader2, Send, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion } from 'framer-motion';

const ChatPage = () => {
    const { user: currentUser } = useAuth();
    const { addNotification } = useNotifications();

    const [usersToChatWith, setUsersToChatWith] = useState<User[]>([]);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    const [loading, setLoading] = useState({ users: true, rooms: true, messages: false });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevRoomsRef = useRef<ChatRoom[]>([]);

    useEffect(() => {
        prevRoomsRef.current = chatRooms;
    });

    // 1. Fetch users and subscribe to chat rooms
    useEffect(() => {
        if (!currentUser) return;

        let isMounted = true;
        const fetchUsersAndRooms = async () => {
            setLoading(p => ({ ...p, users: true, rooms: true }));
            const allUsers = await getUsers();
            if (!isMounted) return;

            if (currentUser.role === UserRole.Staff || currentUser.role === UserRole.Admin) {
                setUsersToChatWith(allUsers.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));
            } else { // Intern
                setUsersToChatWith(allUsers.filter(u => u.role === UserRole.Staff || u.role === UserRole.Admin));
            }
            setLoading(p => ({ ...p, users: false }));
        };

        fetchUsersAndRooms();
        
        const unsubscribeRooms = getChatRoomsForUser(currentUser.id, (newRooms) => {
            if (!isMounted) return;
            const oldRooms = prevRoomsRef.current;
            newRooms.forEach(newRoom => {
                const oldRoom = oldRooms.find(r => r.id === newRoom.id);
                if (
                    newRoom.lastMessage &&
                    newRoom.id !== selectedRoomId &&
                    newRoom.lastMessage.senderId !== currentUser.id &&
                    (!oldRoom || !oldRoom.lastMessage || (newRoom.lastMessage.timestamp && oldRoom.lastMessage.timestamp && newRoom.lastMessage.timestamp > oldRoom.lastMessage.timestamp))
                ) {
                    const senderName = newRoom.participantInfo[newRoom.lastMessage.senderId]?.name || 'Seseorang';
                    addNotification({
                        recipient: currentUser.role as any,
                        type: 'info',
                        message: `Pesan baru dari ${senderName}`,
                        link: currentUser.role === UserRole.Staff ? '/staff/chat' : '/intern/chat',
                    });
                }
            });
            setChatRooms(newRooms);
            setLoading(p => ({ ...p, rooms: false }));
        });

        return () => {
            isMounted = false;
            unsubscribeRooms();
        };
    }, [currentUser]);

    // 2. Subscribe to messages for the selected room
    useEffect(() => {
        if (!selectedRoomId) {
            setMessages([]);
            return;
        };

        setLoading(p => ({ ...p, messages: true }));
        const unsubscribeMessages = getMessagesStream(selectedRoomId, (newMessages) => {
            setMessages(newMessages);
            setLoading(p => ({ ...p, messages: false }));
        });

        return () => unsubscribeMessages();
    }, [selectedRoomId]);

    // 3. Auto-scroll to bottom
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [messages]);

    const handleSelectUser = async (user: User) => {
        if (!currentUser) return;
        const roomId = await findOrCreateChatRoom(currentUser, user);
        setSelectedRoomId(roomId);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRoomId || !currentUser) return;

        const text = newMessage;
        setNewMessage('');
        await sendMessage(selectedRoomId, currentUser.id, currentUser.name, text);
    };
    
    const otherParticipant = selectedRoomId ? chatRooms.find(r => r.id === selectedRoomId)?.participantInfo[
        chatRooms.find(r => r.id === selectedRoomId)!.participantIds.find(id => id !== currentUser?.id)!
    ] : null;

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl border overflow-hidden">
            {/* Left Panel: User/Room List */}
            <div className="w-full md:w-1/3 border-r flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-primary">Pesan</h2>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading.users || loading.rooms ? <div className="p-4 text-center"><Loader2 className="animate-spin text-primary mx-auto"/></div> : (
                        <ul>
                            {usersToChatWith.map(user => {
                                const room = chatRooms.find(r => r.participantIds.includes(user.id));
                                return (
                                    <li key={user.id} onClick={() => handleSelectUser(user)}
                                        className={`p-4 cursor-pointer hover:bg-base-100 border-b ${room?.id === selectedRoomId ? 'bg-blue-50' : ''}`}
                                    >
                                        <p className="font-semibold text-base-content">{user.name}</p>
                                        {room?.lastMessage && (
                                            <p className="text-sm text-muted truncate">
                                                {room.lastMessage.senderId === currentUser?.id ? 'Anda: ' : ''}{room.lastMessage.text}
                                            </p>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* Right Panel: Chat Window */}
            <div className="hidden md:flex w-2/3 flex-col bg-gray-100">
                {!selectedRoomId ? (
                    <div className="flex-grow flex items-center justify-center text-muted text-center p-4">Pilih pengguna untuk memulai percakapan.</div>
                ) : (
                    <>
                        <div className="p-4 border-b bg-white flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center font-bold text-primary flex-shrink-0"><UserIcon /></div>
                            <div>
                                <h3 className="font-bold text-primary">{otherParticipant?.name}</h3>
                                <p className="text-xs text-muted">{otherParticipant?.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-4 bg-gray-900">
                            <div className="space-y-4">
                                {loading.messages ? <div className="text-center"><Loader2 className="animate-spin text-white mx-auto"/></div> : (
                                    messages.map(msg => (
                                        <motion.div 
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex items-end gap-2 ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-md p-3 rounded-2xl ${msg.senderId === currentUser?.id ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'} text-white`}>
                                                <p className="text-sm">{msg.text}</p>
                                                <p className="text-xs text-white/60 text-right mt-1">{format(new Date(msg.timestamp), 'HH:mm')}</p>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Ketik pesan..."
                                    className="flex-1 p-3 border rounded-full bg-base-100 focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-accent text-white rounded-full hover:bg-accent/90 disabled:opacity-50 transition-colors">
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatPage;