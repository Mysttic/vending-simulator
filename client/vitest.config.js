import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Konfiguracja testów trzymana osobno od vite.config.js, żeby build produkcyjny
// pozostał nietknięty.
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        css: false
    }
});
