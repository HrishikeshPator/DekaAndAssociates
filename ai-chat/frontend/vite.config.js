import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../public/ai-chat-widget',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `ai-chat.js`,
        chunkFileNames: `ai-chat.js`,
        assetFileNames: `ai-chat.[ext]`
      }
    }
  }
})
