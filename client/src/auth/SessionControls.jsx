import React from 'react';
import { useAuth } from './AuthContext.jsx';

/** Nazwa zalogowanego uzytkownika + wylogowanie z panelu (Tailwind, ciemny motyw). */
export default function SessionControls({ className = '' }) {
    const { user, logout } = useAuth();
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-[11px] text-gray-400 font-mono">&#128100; {user}</span>
            <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10 rounded px-2 py-1 transition-colors"
            >
                Wyloguj
            </button>
        </div>
    );
}
