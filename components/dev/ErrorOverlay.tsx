import React, { useState } from 'react';
import { Terminal, Lightbulb, RefreshCw, Loader2, Copy, Check } from 'lucide-react';

interface ErrorOverlayProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, errorInfo }) => {
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorFromAI, setErrorFromAI] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleGetSuggestion = async () => {
        setIsLoading(true);
        setAiSuggestion('');
        setErrorFromAI('');
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'diagnoseError',
                    errorMessage: error?.toString(),
                    componentStack: errorInfo?.componentStack
                })
            });

            if (!response.ok || !response.body) {
                const errText = await response.text();
                throw new Error(errText || 'Gagal mendapatkan saran dari AI.');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while(true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setAiSuggestion(prev => prev + chunk);
            }

        } catch (err: any) {
            setErrorFromAI(err.message || 'Terjadi error tidak diketahui.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(aiSuggestion);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col">
                <header className="p-4 border-b bg-red-600 text-white rounded-t-lg flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Terminal size={24} />
                        <h1 className="text-xl font-bold">Application Error</h1>
                    </div>
                    <button onClick={() => window.location.reload()} className="p-2 rounded-full hover:bg-white/20" title="Reload Page">
                        <RefreshCw size={18} />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-red-700">Pesan Error</h2>
                        <pre className="mt-2 p-3 bg-red-50 text-red-900 rounded-md text-sm whitespace-pre-wrap font-mono">{error?.toString()}</pre>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700">Component Stack</h2>
                        <pre className="mt-2 p-3 bg-gray-100 text-gray-800 rounded-md text-xs whitespace-pre-wrap font-mono max-h-48 overflow-auto">{errorInfo?.componentStack}</pre>
                    </div>
                    <div className="pt-6 border-t">
                        <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2"><Lightbulb /> Diagnosis AI</h2>
                        
                        {!aiSuggestion && !isLoading && (
                            <div className="text-center p-4">
                                <p className="text-gray-600 mb-4">Stuck? Biarkan asisten AI kami menganalisis error ini dan memberikan saran perbaikan.</p>
                                <button onClick={handleGetSuggestion} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                                    Dapatkan Saran AI
                                </button>
                            </div>
                        )}
                        
                        {isLoading && (
                            <div className="flex items-center justify-center gap-3 p-6 text-gray-600">
                                <Loader2 className="animate-spin text-blue-600" />
                                <span>AI sedang menganalisis error...</span>
                            </div>
                        )}
                        
                        {errorFromAI && <p className="text-red-600 text-center p-4">{errorFromAI}</p>}

                        {aiSuggestion && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg relative group">
                                <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-white/50 rounded-md text-gray-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity" title={isCopied ? "Tersalin!" : "Salin"}>
                                    {isCopied ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                                </button>
                                <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 overflow-x-auto">
                                    <code>{aiSuggestion}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorOverlay;
