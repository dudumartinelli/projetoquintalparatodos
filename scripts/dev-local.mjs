import { createServer } from 'vite'
import process from 'node:process'

process.env.LOCAL_TEST_MODE = 'true'
process.env.NODE_ENV = 'development'

const server = await createServer({ server: { port: 3000 } })
await server.listen()
server.printUrls()

const shutdown = () => {
  void server.close()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
