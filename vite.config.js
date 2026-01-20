import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // De 'base' moet overeenkomen met je repository naam op GitHub
  base: '/THEARCHIVE/', 
})