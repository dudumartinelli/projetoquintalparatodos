import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const localTestMode = process.env.LOCAL_TEST_MODE === 'true'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    netlify(localTestMode ? { dev: { edgeFunctions: { enabled: false } } } : {}),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
