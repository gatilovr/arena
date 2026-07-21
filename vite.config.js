import { defineConfig } from 'vite';

// Клиент живёт в /client. В dev Vite раздаёт его и проксирует WebSocket на игровой сервер.
// Для игры по LAN запускай `npm run client` (флаг --host уже включён) — открой http://<LAN-IP>:5173
export default defineConfig({
  root: 'client',
  server: {
    host: true,          // слушать все интерфейсы → доступно по Wi-Fi/LAN
    port: 5173,
    strictPort: true,
    proxy: {
      // /ws → локальный игровой сервер. Клиент всегда коннектится к location.host,
      // поэтому это работает и на localhost, и по LAN без изменений в коде.
      '/ws': { target: 'ws://localhost:3001', ws: true, changeOrigin: true }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('three/examples/jsm')) {
              return 'three';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
