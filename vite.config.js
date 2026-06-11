import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Forced cache reset timestamp: 2026-06-11
export default defineConfig({
  plugins: [react()],
  base: './',
})