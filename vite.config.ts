import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no modo (development/production)
  // O terceiro argumento '' garante que carregue todas as vars, não apenas as que começam com VITE_
  // @ts-ignore
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    // Importante para Cloudflare Pages e deploys estáticos
    base: './', 
    define: {
      // Injeta a API_KEY de forma segura. Se não existir, injeta uma string vazia para evitar crash.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});