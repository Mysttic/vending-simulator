import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import LoginGate from './LoginGate.jsx';
import { verifyCredentials, configuredUser } from './credentials.js';

const PASSWORD = 'vending';
const SESSION_KEY = 'vending-sim-ui-session';
const LOCKOUT_KEY = 'vending-sim-ui-lockout';

/**
 * Atrapa panelu. Odpytuje API zaraz po zamontowaniu — jeśli bramka przepuści ją
 * przed zalogowaniem, test to zobaczy po wywołaniu fetch, a nie tylko po tekście.
 */
function Panel() {
    const { user, logout } = useAuth();
    React.useEffect(() => { fetch('/admin/status'); }, []);
    return (
        <div>
            <span>PANEL SYMULATORA</span>
            <span>{`user:${user}`}</span>
            <button onClick={() => logout()}>Wyloguj</button>
        </div>
    );
}

function renderGate() {
    return render(
        <AuthProvider>
            <LoginGate>
                <Panel />
            </LoginGate>
        </AuthProvider>
    );
}

const passwordBox = () => screen.getByLabelText('Hasło');
const submit = () => screen.getByRole('button', { name: /Zaloguj|Zablokowane/ });

function login(password) {
    fireEvent.change(passwordBox(), { target: { value: password } });
    fireEvent.click(submit());
}

describe('bramka logowania panelu', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('bez zalogowania nie renderuje panelu i nie odpytuje API', () => {
        renderGate();

        expect(screen.getByLabelText('Użytkownik')).toBeInTheDocument();
        expect(passwordBox()).toBeInTheDocument();
        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('odrzuca złe hasło, panel dalej nie istnieje', () => {
        renderGate();
        login('nie-to-haslo');

        expect(screen.getByText(/Nieprawidłowy login lub hasło/)).toBeInTheDocument();
        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
        expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('wpuszcza po poprawnym haśle i dopiero wtedy panel odpytuje API', () => {
        renderGate();
        login(PASSWORD);

        expect(screen.getByText('PANEL SYMULATORA')).toBeInTheDocument();
        expect(screen.getByText(`user:${configuredUser}`)).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith('/admin/status');
        expect(sessionStorage.getItem(SESSION_KEY)).toContain(configuredUser);
    });

    it('Enter w polu hasła loguje tak samo jak przycisk', () => {
        renderGate();
        fireEvent.change(passwordBox(), { target: { value: PASSWORD } });
        fireEvent.keyDown(passwordBox(), { key: 'Enter' });

        expect(screen.getByText('PANEL SYMULATORA')).toBeInTheDocument();
    });

    it('pięć nieudanych prób blokuje formularz', () => {
        renderGate();
        for (let i = 0; i < 5; i++) login('zle' + i);

        expect(submit()).toBeDisabled();
        expect(screen.getByText(/Zbyt wiele nieudanych prób/)).toBeInTheDocument();

        // Poprawne hasło w czasie blokady też nie wpuszcza.
        login(PASSWORD);
        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
    });

    it('wylogowanie zamyka panel i czyści sesję', () => {
        renderGate();
        login(PASSWORD);
        expect(screen.getByText('PANEL SYMULATORA')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }));

        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
        expect(passwordBox()).toBeInTheDocument();
        expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('świeża sesja w sessionStorage wpuszcza bez pytania o hasło', () => {
        const now = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: configuredUser, loginAt: now, lastSeenAt: now }));
        renderGate();

        expect(screen.getByText('PANEL SYMULATORA')).toBeInTheDocument();
    });

    it('sesja przeterminowana bezczynnością nie jest przywracana', () => {
        const stale = Date.now() - 31 * 60 * 1000; // domyślny limit to 30 minut
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: configuredUser, loginAt: stale, lastSeenAt: stale }));
        renderGate();

        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
        expect(passwordBox()).toBeInTheDocument();
    });

    it('uszkodzony wpis sesji nie wpuszcza do panelu', () => {
        sessionStorage.setItem(SESSION_KEY, '{nie-json');
        renderGate();

        expect(screen.queryByText('PANEL SYMULATORA')).not.toBeInTheDocument();
    });

    it('licznik nieudanych prób przeżywa przeładowanie panelu', () => {
        const { unmount } = renderGate();
        login('zle');
        unmount();

        expect(JSON.parse(sessionStorage.getItem(LOCKOUT_KEY)).attempts).toBe(1);
    });
});

describe('verifyCredentials', () => {
    it('przyjmuje wyłącznie skonfigurowaną parę', () => {
        expect(verifyCredentials(configuredUser, PASSWORD)).toBe(true);
        expect(verifyCredentials(configuredUser, PASSWORD.toUpperCase())).toBe(false);
        expect(verifyCredentials(configuredUser, '')).toBe(false);
        expect(verifyCredentials('ktos-inny', PASSWORD)).toBe(false);
    });

    it('ignoruje białe znaki wokół loginu', () => {
        expect(verifyCredentials(`  ${configuredUser}  `, PASSWORD)).toBe(true);
    });
});
