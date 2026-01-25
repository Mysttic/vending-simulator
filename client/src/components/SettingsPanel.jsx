import React, { useState } from 'react';
import { Settings, Save, X } from 'lucide-react';

export const SettingsPanel = ({ status, onSave }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [apiKey, setApiKey] = useState("");

    const handleSave = () => {
        onSave(url, apiKey).then(success => {
            if (success) setIsOpen(false);
        });
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors z-50 hover:rotate-90 duration-500"
            >
                <Settings size={20} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-md p-6 rounded-xl shadow-2xl relative">
                <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Settings size={20} /> Machine Config
                </h2>
                <p className="text-sm text-gray-500 mb-6">Connect this unit to an external Warehouse Management System.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">WMS Webhook URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://your-wms.com/api/webhook"
                            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">API Key (Optional)</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="sk_live_..."
                            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded text-xs text-blue-200">
                        <p className="font-bold mb-1">Current Status:</p>
                        <p>Machine ID: {status?.machine_id}</p>
                        <p>Status: {status?.status}</p>
                        <p>Integration: <span className={status?.webhook_configured ? "text-green-400" : "text-gray-500"}>{status?.webhook_configured ? "Active" : "Not Configured"}</span></p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <Save size={16} /> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
