#!/usr/bin/env node
'use strict';

// Generuje VITE_UI_PASSWORD_HASH dla panelu symulatora.
//
//   node scripts/ui-password-hash.cjs <login> <hasło>
//
// Wynik wklej do .env obok docker-compose.yml (UI_USER / UI_PASSWORD_HASH)
// i przebuduj obraz UI: docker compose up -d --build client

const crypto = require('crypto');

const [user, password] = process.argv.slice(2);

if (!user || !password) {
    console.error('Użycie: node scripts/ui-password-hash.cjs <login> <hasło>');
    process.exit(1);
}

const hash = crypto.createHash('sha256').update(`${user}:${password}`, 'utf8').digest('hex');

console.log(`UI_USER=${user}`);
console.log(`UI_PASSWORD_HASH=${hash}`);
