import React from 'react';
import { clsx } from 'clsx';
import { Package } from 'lucide-react';

export const Shelf = ({ slot, onSelect }) => {
    const isOut = slot.count === 0;

    return (
        <div
            onClick={() => !isOut && onSelect(slot.id)}
            className={clsx(
                "relative flex flex-col items-center justify-end p-2 h-32 w-24 bg-gray-900/50 rounded-lg border border-white/10 shadow-inner group transition-all duration-300",
                !isOut && "cursor-pointer hover:bg-white/5 hover:border-blue-400/50 hover:scale-105",
                isOut && "opacity-50 grayscale"
            )}
        >
            <div className="absolute top-2 left-2 text-xs font-mono text-gray-400">{slot.id}</div>
            <div className="flex-1 flex items-center justify-center">
                {/* Placeholder for Product Image */}
                <div className={clsx(
                    "w-12 h-20 rounded shadow-lg transition-transform",
                    slot.name.includes("Cola") ? "bg-red-600" :
                        slot.name.includes("Water") ? "bg-blue-400/50 backdrop-blur" :
                            "bg-yellow-500"
                )}>
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-white/80 font-bold -rotate-90">
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
