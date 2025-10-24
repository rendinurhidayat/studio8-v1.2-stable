import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { Bot, Send, User, Loader2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Gemini-formatted message
interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// Internal message format for UI
interface UIMessage {
    id: string;
    text: React.ReactNode;
    sender: 'bot' | 'user';
}

const faqQuestions = [
    "Berapa DP yang harus dibayar?",
    "Bagaimana cara reschedule?",
    "Metode pembayaran apa saja yang ada?",
    "Di mana lokasi studionya?"
];

const ChatbotModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [history, setHistory] = useState<GeminiMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFaqs, setShowFaqs] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsInitializing(false);
            if(messages.length === 0) {
                 setMessages([
                    { id: crypto.randomUUID(), sender: 'bot', text: "Halo! 👋 Saya Otto, asisten virtual Studio 8. Ada yang bisa saya bantu terkait info umum, jadwal, atau cara booking?" }
                ]);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;
        setShowFaqs(false);
        setError(null);

        const userMessage: UIMessage = { id: crypto.randomUUID(), text: messageText, sender: 'user' };
        const userHistoryMessage: GeminiMessage = { role: 'user', parts: [{ text: messageText }] };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const botMessageId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: botMessageId, text: <Loader2 className="animate-spin text-gray-500" size={20} />, sender: 'bot' }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: [...history, userHistoryMessage],
                }),
            });

            if (!response.ok || !response.body) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal terhubung dengan asisten AI.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponse = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                botResponse += decoder.decode(value, { stream: true });

                setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId ? { ...msg, text: botResponse } : msg
                ));
            }

            const botHistoryMessage: GeminiMessage = { role: 'model', parts: [{ text: botResponse }] };
            setHistory(prev => [...prev, userHistoryMessage, botHistoryMessage]);

        } catch (error: any) {
            console.error("Chatbot API error:", error);
            const errorMessage = "Maaf, terjadi kesalahan. Coba beberapa saat lagi ya.";
            setError(errorMessage);
            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, text: errorMessage } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        const userMessage = input;
        if (!userMessage.trim()) return;
        setInput('');
        await sendMessage(userMessage);
    };

    const handleFaqClick = async (question: string) => {
        setInput('');
        await sendMessage(question);
    };

    const renderChatContent = () => {
        if (isInitializing) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                    <Loader2 className="animate-spin mb-2" size={24} />
                    <p>Mempersiapkan asisten AI...</p>
                </div>
            );
        }
        return (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-lg">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-slate-600"/></div>}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-primary text-primary-content rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'}`}>
                                    <div className="text-sm prose prose-sm max-w-none">{msg.text}</div>
                                </div>
                                {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center flex-shrink-0"><User size={20} /></div>}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={chatEndRef} />
                </div>
                
                <AnimatePresence>
                    {showFaqs && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="pt-3 mt-3 border-t border-slate-200"
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2 px-1">
                                <Zap size={16} />
                                <h4 className="font-semibold">Saran Pertanyaan</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {faqQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleFaqClick(q)}
                                        className="w-full text-left text-sm p-3 bg-white border rounded-lg hover:bg-slate-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Tanya apa saja..."
                        disabled={isLoading || isInitializing}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                    <button onClick={handleSend} disabled={isLoading || !input.trim() || isInitializing} className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                        <Send size={20} />
                    </button>
                </div>
            </>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Studio 8 Support AI">
            <div className="flex flex-col h-[60vh]">
                {renderChatContent()}
            </div>
        </Modal>
    );
};

export default ChatbotModal;