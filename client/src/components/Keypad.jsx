import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useLogs } from '../contexts/LogContext';

export const ControlPanel = ({ message, balance, dispensedItem, onClearItem, onInsertMoney, onSelectSlot, onRefund }) => {
    const [input, setInput] = useState("");
    const { addLog } = useLogs();

    // Manual Pickup Only - Timer Removed as per user request (or increased indefinitely)
    // We rely on onClearItem being called manually.

    const handleKey = (k) => {
        addLog('USER', `Pressed Key '${k}'`);
        if (k === 'C') {
            setInput("");
            return;
        }
        if (k === 'E') {
            if (input) onSelectSlot(input);
            setInput("");
            return;
        }
        if (input.length < 2) setInput(prev => prev + k);
    };

    const handleMoney = (amount) => {
        // Logic handled in hook, but we can log user intention here too or rely on hook
        // Hook logs "Inserted $X"
        onInsertMoney(amount);
    };

    const handlePickup = () => {
        if (dispensedItem) {
            addLog('USER', 'Clicked Pickup Box');
            onClearItem();
        } else {
            addLog('USER', 'Clicked Empty Pickup Box');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-800 rounded-r-xl shadow-2xl w-64 border-l border-gray-700">

            {/* LCD Display */}
            <div className="bg-blue-900/40 p-3 rounded border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <div className="font-mono text-blue-100 text-sm h-6 overflow-hidden whitespace-nowrap scrolling-text">
                    {message}
                </div>
                <div className="flex justify-between items-end mt-1">
                    <div className="text-xl font-mono text-green-400 font-bold">
                        {input || "--"}
                    </div>
                    <div className="text-xs text-blue-300">
                        CREDIT: <span className="text-white text-lg">${balance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Payment Simulation */}
            <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-2 rounded border border-white/5">
                <button onClick={() => handleMoney(0.25)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors shadow-inner flex items-center justify-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-400 border border-gray-300"></div> $0.25
                </button>
                <button onClick={() => handleMoney(1.00)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors shadow-inner flex items-center justify-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-300"></div> $1.00
                </button>
                <button onClick={() => handleMoney(5.00)} className="col-span-2 px-2 py-1 bg-green-800 hover:bg-green-700 rounded text-xs text-white transition-colors shadow-inner border border-green-600/50">
                    Insert $5 Bill
                </button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 mt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'E'].map(key => (
                    <button
                        key={key}
                        onClick={() => handleKey(key)}
                        className={`
                    h-10 rounded shadow-lg font-bold transition-all active:scale-95
                    ${key === 'E' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/50' :
                                key === 'C' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' :
                                    'bg-gray-200 hover:bg-white text-gray-900 shadow-gray-950/50'}
                `}
                    >
                        {key === 'E' ? 'ENTER' : key}
                    </button>
                ))}
            </div>

            <button
                onClick={onRefund}
                disabled={balance === 0}
                className="mt-4 py-2 w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 text-xs rounded border border-gray-600 shadow-inner"
            >
                RETURN CHANGE
            </button>

            <div
                onClick={handlePickup}
                className="mt-8 mx-auto w-32 h-24 bg-black rounded-t-lg border-x-4 border-t-4 border-gray-700 relative shadow-inner flex items-end justify-center pb-2 overflow-hidden cursor-pointer active:scale-95 transition-transform"
            >
                {/* Pickup Box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {dispensedItem ? (
                        <div className="animate-bounce flex flex-col items-center">
                            <div
                                className={clsx(
                                    "rounded shadow-lg rotate-12 transition-transform",
                                    // Dynamic sizing based on type if passed, but assume standard for physics simulation
                                    "w-12 h-20"
                                )}
                                style={{ backgroundColor: dispensedItem.color || 'red' }}
                            >
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-white/80 font-bold -rotate-90">
                                    {dispensedItem.name}
                                </div>
                            </div>
                            <span className="text-[9px] text-green-400 bg-black/50 px-1 rounded mt-1">Click to Pickup</span>
                        </div>
                    ) : (
                        <div className="text-[10px] text-gray-600">PUSH</div>
                    )}
                </div>
            </div>
        </div>
    );
};
