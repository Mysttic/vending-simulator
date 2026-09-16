import { sha256Hex } from './sha256.js';

// Poświadczenia panelu. Domyślnie: admin / vending
//
// Nadpisanie przy budowaniu UI (build args Vite):
//   VITE_UI_USER           login, domyślnie "admin"
//   VITE_UI_PASSWORD_HASH  sha256("<login>:<hasło>") w hex, zalecane
//   VITE_UI_PASSWORD       hasło jawne, tylko dla developmentu
//   VITE_UI_IDLE_MINUTES   auto-wylogowanie po bezczynności, domyślnie 30
//
// Hash wygrywa nad hasłem jawnym. Hash generuje scripts/ui-password-hash.cjs.

const DEFAULT_USER = 'admin';
const DEFAULT_PASSWORD_HASH = 'f0d05828fd1ea11edb08be4fb29ad7cff811fe31332b2e422c09f7c2ce597a21'; // sha256("admin:vending")
const DEFAULT_IDLE_MINUTES = 30;

const envUser = String(import.meta.env.VITE_UI_USER || '').trim();
const envHash = String(import.meta.env.VITE_UI_PASSWORD_HASH || '').trim().toLowerCase();
const envPassword = String(import.meta.env.VITE_UI_PASSWORD || '');

export const configuredUser = envUser || DEFAULT_USER;

export const idleTimeoutMs = (() => {
    const raw = Number(import.meta.env.VITE_UI_IDLE_MINUTES);
    const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_IDLE_MINUTES;
    return minutes * 60 * 1000;
})();

export function verifyCredentials(user, password) {
    if (String(user).trim() !== configuredUser) return false;
    if (envHash) return sha256Hex(`${configuredUser}:${password}`) === envHash;
    if (envPassword) return password === envPassword;
    return sha256Hex(`${DEFAULT_USER}:${password}`) === DEFAULT_PASSWORD_HASH;
}
