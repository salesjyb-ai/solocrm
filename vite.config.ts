import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/solocrm/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 코어
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // 차트
          'vendor-recharts': ['recharts'],
          // 아이콘
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})

