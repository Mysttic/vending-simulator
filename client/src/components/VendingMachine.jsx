import React from 'react';
import { useMachine } from '../hooks/useMachine';
import { Shelf } from './Shelf';
import { ControlPanel } from './Keypad';
import { SettingsPanel } from './SettingsPanel';

export const VendingMachine = () => {
    const {
        layout,
        status,
        balance,
        message,
        insertMoney,
        selectItem,
        returnChange,
        updateConfig,
        dispensedItem,
        clearDispensedItem
    } = useMachine();

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8 relative">
            <SettingsPanel status={status} onSave={updateConfig} />

            {/* Machine Cabinet */}
            <div className="relative bg-gray-900 md:bg-[#1a1c23] p-4 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[12px] border-gray-800 flex flex-col md:flex-row gap-6 max-w-5xl w-full">

                {/* Top Logo Panel */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-900 to-purple-900 rounded-t-xl z-0 mx-4 mt-3 flex items-center justify-center shadow-lg border-b border-white/10">
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase italic drop-shadow-md opacity-90">
                        SNACK <span className="text-blue-400">TRON</span> <span className="text-xs align-top font-normal bg-white/20 px-1 rounded ml-1">v2.0</span>
                    </h1>
                </div>

                {/* Glass Window Area */}
                <div className="flex-1 bg-black/60 backdrop-blur-sm rounded-xl border-4 border-gray-700/50 shadow-inner mt-20 mb-8 p-6 relative overflow-hidden">
                    {/* Glossy Reflection */}
                    <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rotate-45 pointer-events-none z-10"></div>

                    <div className="flex flex-col gap-6 relative z-0">
                        {/* Dynamic Rows */}
                        {layout ? layout.rows.map(row => (
                            <div key={row.id} className="flex justify-center gap-4">
                                {row.slots.map(slot => (
                                    <Shelf
                                        key={slot.id}
                                        slot={slot}
                                        height={row.height}
                                        onSelect={selectItem}
                                    />
                                ))}
                            </div>
                        )) : (
                            <div className="text-white">Loading Layout...</div>
                        )}
                    </div>
                </div>

                {/* Side Control Panel (Right) */}
                <div className="mt-20 flex flex-col justify-between">
                    <ControlPanel
                        message={message}
                        balance={balance}
                        dispensedItem={dispensedItem}
                        onClearItem={clearDispensedItem}
                        onInsertMoney={insertMoney}
                        onSelectSlot={selectItem}
                        onRefund={returnChange}
                    />
                </div>

            </div>
        </div>
    );
};
