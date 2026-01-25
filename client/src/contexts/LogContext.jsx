import React, { createContext, useContext, useState, useCallback } from 'react';

const LogContext = createContext();

export const useLogs = () => useContext(LogContext);

export const LogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const addLog = useCallback((param1, param2) => {
        let type = 'INFO';
        let message = '';
        let details = null;

        if (param2) {
            type = param1;
            message = param2;
        } else {
            message = param1;
        }

        if (typeof message === 'object') {
            details = message;
            message = details.message || 'Object Log';
        }

        const newLog = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            details
        };

        setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100
    }, []);

    const toggle = () => setIsOpen(p => !p);

    return (
        <LogContext.Provider value={{ logs, addLog, isOpen, toggle }}>
            {children}
        </LogContext.Provider>
    );
};
