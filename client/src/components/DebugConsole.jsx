import React from 'react';
import { useLogs } from '../contexts/LogContext';
import { Terminal, X, ChevronUp, ChevronDown, Activity, ArrowRight, ArrowLeft } from 'lucide-react';

export const DebugConsole = () => {
    const { logs, isOpen, toggle } = useLogs();

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 flex flex-col ${isOpen ? 'h-64' : 'h-10'}`}>
            {/* Header / Toggle Bar */}
            <div
                onClick={toggle}
                className="bg-gray-900 border-t border-gray-700 h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                    <Terminal size={14} />
                    <span className="font-bold">SYSTEM LOGS</span>
                    <span className="bg-blue-900/50 text-blue-200 px-2 rounded-full text-[10px]">{logs.length}</span>
                </div>
                <div className="text-gray-500">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
            </div>

            {/* Log Content */}
            <div className="flex-1 bg-black/90 overflow-y-auto p-2 font-mono text-xs scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {logs.map(log => (
                    <div key={log.id} className="mb-1 flex gap-2 border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 p-1 rounded">
                        <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`font-bold shrink-0 w-16 text-center rounded px-1 ${log.type === 'API_REQ' ? 'bg-yellow-900/30 text-yellow-500' :
                                log.type === 'API_RES' ? 'bg-green-900/30 text-green-500' :
                                    log.type === 'ERROR' ? 'bg-red-900/30 text-red-500' :
                                        log.type === 'EVENT' ? 'bg-purple-900/30 text-purple-500' :
                                            'text-gray-300'
                            }`}>
                            {log.type}
                        </span>
                        <span className="text-gray-300 break-all">
                            {log.type === 'API_REQ' && <ArrowRight size={10} className="inline mr-1" />}
                            {log.type === 'API_RES' && <ArrowLeft size={10} className="inline mr-1" />}
                            {log.type === 'EVENT' && <Activity size={10} className="inline mr-1" />}
                            {log.message}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="text-gray-600 text-center mt-4">No events recorded.</div>
                )}
            </div>
        </div>
    );
};
