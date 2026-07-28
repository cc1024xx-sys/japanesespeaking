import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteTtsApi } from './plugins/viteTtsApi'

export default defineConfig(({ mode }) => ({
  plugins: [react(), viteTtsApi()],
  base: mode === 'production' ? '/japanesespeaking/' : '/',
}))
