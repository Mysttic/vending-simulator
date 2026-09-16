import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { configuredUser, idleTimeoutMs, verifyCredentials } from './credentials.js';

const STORAGE_KEY = 'vending-sim-ui-session';
const LOCKOUT_KEY = 'vending-sim-ui-lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const TICK_MS = 5000;

const AuthContext = createContext(null);

function readSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.user !== 'string') return null;
        if (Date.now() - Number(parsed.lastSeenAt || 0) > idleTimeoutMs) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeSession(session) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        /* sessionStorage niedostępny (tryb prywatny) — sesja żyje tylko w pamięci */
    }
}

function readLockout() {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(LOCKOUT_KEY) || 'null');
        return parsed && typeof parsed.attempts === 'number' ? parsed : { attempts: 0, until: 0 };
    } catch {
        return { attempts: 0, until: 0 };
    }
}

function writeLockout(state) {
    try {
        sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    } catch {
        /* jak wyżej */
    }
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(() => readSession());
    const [lockout, setLockout] = useState(() => readLockout());
    const [logoutReason, setLogoutReason] = useState(null);
    const lastSeenRef = useRef(session ? session.lastSeenAt : 0);

    const logout = useCallback((reason = null) => {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
        setSession(null);
        setLogoutReason(reason);
    }, []);

    const login = useCallback((user, password) => {
        const now = Date.now();
        const current = readLockout();
        if (current.until > now) {
            setLockout(current);
            return { ok: false, error: 'locked' };
        }
        if (!verifyCredentials(user, password)) {
            const attempts = current.attempts + 1;
            const next = attempts >= MAX_ATTEMPTS
                ? { attempts: 0, until: now + LOCKOUT_MS }
                : { attempts, until: 0 };
            writeLockout(next);
            setLockout(next);
            return { ok: false, error: next.until ? 'locked' : 'invalid' };
        }
        const fresh = { attempts: 0, until: 0 };
        writeLockout(fresh);
        setLockout(fresh);
        const created = { user: configuredUser, loginAt: now, lastSeenAt: now };
        lastSeenRef.current = now;
        writeSession(created);
        setSession(created);
        setLogoutReason(null);
        return { ok: true };
    }, []);

    // Auto-wylogowanie po bezczynności: symulator stoi u klienta na wspólnym
    // stanowisku, więc porzucona zalogowana karta nie może zostać otwarta.
    useEffect(() => {
        if (!session) return undefined;

        const markActivity = () => {
            const now = Date.now();
            lastSeenRef.current = now;
            // Zapis do sessionStorage dławiony, żeby nie pisać przy każdym kliknięciu.
            const stored = readSession();
            if (!stored || now - Number(stored.lastSeenAt || 0) > TICK_MS) {
                writeSession({ ...session, lastSeenAt: now });
            }
        };

        for (const evt of ACTIVITY_EVENTS) {
            window.addEventListener(evt, markActivity, { passive: true });
        }

        const timer = setInterval(() => {
            if (Date.now() - lastSeenRef.current > idleTimeoutMs) {
                logout('idle');
            }
        }, TICK_MS);

        return () => {
            for (const evt of ACTIVITY_EVENTS) {
                window.removeEventListener(evt, markActivity);
            }
            clearInterval(timer);
        };
    }, [session, logout]);

    const value = {
        user: session ? session.user : null,
        isAuthenticated: Boolean(session),
        logoutReason,
        lockedUntil: lockout.until,
        failedAttempts: lockout.attempts,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - lockout.attempts),
        login,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth musi być wywołane wewnątrz <AuthProvider>');
    return ctx;
}
