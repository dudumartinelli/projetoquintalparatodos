import { getStore } from '@netlify/blobs'
import { createFileRoute } from '@tanstack/react-router'

const bannerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedBannerTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const Route = createFileRoute('/api/festival-banners/$bannerId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!bannerIdPattern.test(params.bannerId)) {
          return new Response('Banner não encontrado.', { status: 404 })
        }

        const banner = await getStore('festival-banners').getWithMetadata(params.bannerId, {
          type: 'arrayBuffer',
        })
        const contentType = banner?.metadata.contentType
        if (!banner || typeof contentType !== 'string' || !allowedBannerTypes.has(contentType)) {
          return new Response('Banner não encontrado.', { status: 404 })
        }

        return new Response(banner.data, {
          headers: {
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
