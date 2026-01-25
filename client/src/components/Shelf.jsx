import React from 'react';
import { clsx } from 'clsx';
import { useLogs } from '../contexts/LogContext';

export const Shelf = ({ slot, height, onSelect }) => {
    const { addLog } = useLogs();
    const isOut = slot.count === 0;

    const handleClick = () => {
        addLog('USER', `Clicked Shelf ${slot.id} (${slot.name})`);
        if (!isOut) onSelect(slot.id);
    };

    return (
        <div
            onClick={handleClick}
            className={clsx(
                "relative flex flex-col items-center justify-end p-2 w-24 bg-gray-900/50 rounded-lg border border-white/10 shadow-inner group transition-all duration-300",
                height === 'tall' ? "h-48" : "h-32",
                !isOut && "cursor-pointer hover:bg-white/5 hover:border-blue-400/50 hover:scale-105",
                isOut && "opacity-50 grayscale"
            )}
        >
            <div className="absolute top-2 left-2 text-xs font-mono text-gray-400">{slot.id}</div>
            <div className="flex-1 flex items-center justify-center">
                {/* Product Image Placeholder */}
                <div
                    className={clsx(
                        "rounded shadow-lg transition-transform",
                        height === 'tall' ? "w-12 h-32" : "w-12 h-20"
                    )}
                    style={{ backgroundColor: slot.color || '#666' }}
                >
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-white/90 font-bold -rotate-90">
                        {slot.name}
                    </div>
                </div>
            </div>

            {/* Spring/Coil Simulation */}
            <div className="w-16 h-2 border-b-2 border-dashed border-gray-600 rounded-[50%] absolute bottom-8"></div>

            <div className="flex justify-between w-full mt-2 px-1">
                <span className="text-xs text-green-400 font-mono">${slot.price.toFixed(2)}</span>
                <span className={clsx("text-[10px] px-1 rounded", slot.count < 3 ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300")}>
                    {isOut ? "EMPTY" : `x${slot.count}`}
                </span>
            </div>
        </div>
    );
};
