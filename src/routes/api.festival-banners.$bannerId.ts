import { getStore } from '@netlify/blobs'
import { createFileRoute } from '@tanstack/react-router'

import { isLocalTestMode, readLocalBanner } from '@/lib/local-test-store.server'

const bannerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedBannerTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const Route = createFileRoute('/api/festival-banners/$bannerId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!bannerIdPattern.test(params.bannerId)) {
          return new Response('Banner não encontrado.', { status: 404 })
        }

        if (isLocalTestMode()) {
          const banner = await readLocalBanner(params.bannerId)
          if (!banner || !allowedBannerTypes.has(banner.contentType)) {
            return new Response('Banner não encontrado.', { status: 404 })
          }
          return new Response(banner.data, {
            headers: {
              'Cache-Control': 'no-store',
              'Content-Type': banner.contentType,
              'X-Content-Type-Options': 'nosniff',
            },
          })
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
