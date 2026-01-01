import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8000, // 前端端口
    proxy: {
      // 代理后端API请求
      '/api': {
        target: 'http://localhost:8080', // 后端地址
        changeOrigin: true,
        secure: false
      }
    }
  }
})