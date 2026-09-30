import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function localUploadPlugin() {
  return {
    name: 'local-upload',
    configureServer(server) {
      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method === 'POST') {
          // Increase payload limit by accumulating chunks without destroying memory
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
             try {
               const data = JSON.parse(body)
               const base64Data = data.base64.split(',')[1]
               const buffer = Buffer.from(base64Data, 'base64')
               
               const applicantDir = data.applicantId ? `${data.applicantId}_docs` : 'misc_docs'
               const uploadDir = path.resolve(__dirname, 'public/uploads', applicantDir)
               
               if (!fs.existsSync(uploadDir)) {
                 fs.mkdirSync(uploadDir, { recursive: true })
               }
               
               const safeName = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
               fs.writeFileSync(path.join(uploadDir, safeName), buffer)
               
               res.setHeader('Content-Type', 'application/json')
               res.end(JSON.stringify({ url: `/uploads/${applicantDir}/${safeName}` }))
             } catch (err) {
               res.statusCode = 500
               res.end(JSON.stringify({ error: err.message }))
             }
          })
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localUploadPlugin()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, '')
      }
    }
  }
})
