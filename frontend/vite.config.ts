import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Прокси для разработки — запросы /requests уходят на твой FastAPI
  server: {
    proxy: {
      '/requests': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Сборка прямо в папку backend/static (удобно для деплоя)
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
})