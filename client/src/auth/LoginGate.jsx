import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { configuredUser } from './credentials.js';

const C = {
    panel: '#1a1c23',
    line: '#374151',
    text: '#f3f4f6',
    muted: '#9ca3af',
    field: '#030712',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    danger: '#f87171'
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: C.field,
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    color: C.text,
    padding: '0.5rem 0.65rem',
    fontSize: '0.9rem',
    outline: 'none'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    color: C.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

function LoginForm() {
    const { login, logoutReason, lockedUntil, remainingAttempts } = useAuth();
    const [user, setUser] = useState(configuredUser);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [now, setNow] = useState(Date.now());

    const locked = lockedUntil > now;
    const secondsLeft = Math.ceil((lockedUntil - now) / 1000);

    useEffect(() => {
        if (lockedUntil <= Date.now()) return undefined;
        const t = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(t);
    }, [lockedUntil]);

    const onSubmit = (e) => {
        e.preventDefault();
        if (locked) return;
        const result = login(user, password);
        if (result.ok) return;
        setPassword('');
        setNow(Date.now());
        setError(result.error === 'locked'
            ? 'Zbyt wiele nieudanych prób. Panel zablokowany na 30 sekund.'
            : 'Nieprawidłowy login lub hasło.');
    };

    // Enter obsługiwany jawnie: preventDefault na keydown zdejmuje domyślne
    // wysłanie formularza, więc próba logowania leci dokładnie raz.
    const onEnter = (e) => {
        if (e.key === 'Enter') onSubmit(e);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: C.field,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'auto'
        }}>
            <form
                onSubmit={onSubmit}
                style={{
                    width: 360,
                    maxWidth: '100%',
                    background: C.panel,
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    padding: '1.25rem',
                    color: C.text,
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
                }}
            >
                <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 10 }}>🥤</div>
                <h1 style={{ margin: '0 0 4px', fontSize: 18 }}>Vending – Symulator</h1>
                <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: C.muted }}>
                    Panel wymaga zalogowania.
                </p>

                {logoutReason === 'idle' && (
                    <div style={{
                        marginBottom: 12,
                        fontSize: '0.75rem',
                        color: C.muted,
                        border: `1px solid ${C.line}`,
                        borderRadius: 8,
                        padding: '0.4rem 0.6rem'
                    }}>
                        Wylogowano po okresie bezczynności
                    </div>
                )}

                <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle} htmlFor="ui-login-user">Użytkownik</label>
                    <input
                        id="ui-login-user"
                        style={inputStyle}
                        value={user}
                        autoComplete="username"
                        onKeyDown={onEnter}
                        onChange={(e) => setUser(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle} htmlFor="ui-login-password">Hasło</label>
                    <input
                        id="ui-login-password"
                        type="password"
                        style={inputStyle}
                        value={password}
                        autoFocus
                        autoComplete="current-password"
                        onKeyDown={onEnter}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && (
                    <div style={{ color: C.danger, fontSize: '0.8rem', marginBottom: 12 }}>
                        {error}
                        {!locked && remainingAttempts > 0 && remainingAttempts < 5 && (
                            <span style={{ color: C.muted }}> Pozostałe próby: {remainingAttempts}.</span>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={locked}
                    style={{
                        width: '100%',
                        padding: '0.55rem',
                        background: locked ? C.line : C.accent,
                        color: '#fff',
                        border: 0,
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        cursor: locked ? 'not-allowed' : 'pointer'
                    }}
                    onMouseOver={(e) => { if (!locked) e.currentTarget.style.background = C.accentHover; }}
                    onMouseOut={(e) => { if (!locked) e.currentTarget.style.background = C.accent; }}
                >
                    {locked ? `Zablokowane (${secondsLeft} s)` : 'Zaloguj'}
                </button>
            </form>
        </div>
    );
}

/** Przed zalogowaniem nie montuje dzieci, więc panel nie odpytuje API. */
export default function LoginGate({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <LoginForm />;
}
