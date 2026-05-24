/**
 * PDF proxy route — GET /api/sales/[id]/constancia-emissions/[emissionId]/pdf
 *
 * Proxies the backend PDF endpoint through Next.js so that:
 * 1. The backend URL is never exposed to the browser
 * 2. The httpOnly JWT cookie is automatically forwarded
 * 3. PDF binary is streamed with correct Content-Type and Content-Disposition
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { env } from '@/shared/config/env'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; emissionId: string }> },
) {
  try {
    const { id, emissionId } = await params

    // Read JWT from httpOnly cookie
    const jar = await cookies()
    const sessionCookie = jar.get(env.COOKIE_NAME)
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No session cookie found' },
        { status: 401 },
      )
    }

    const backendUrl = `${env.API_BASE_URL}/api/v1/sales/${id}/constancia-emissions/${emissionId}/pdf`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionCookie.value}`,
        Accept: 'application/pdf',
      },
    })

    if (!backendResponse.ok) {
      // Forward backend error as JSON
      let errorBody: Record<string, unknown>
      try {
        errorBody = (await backendResponse.json()) as Record<string, unknown>
      } catch {
        errorBody = {
          error: 'ProxyError',
          message: `Backend returned status ${backendResponse.status}`,
        }
      }
      return NextResponse.json(errorBody, { status: backendResponse.status })
    }

    // Read PDF binary from backend
    const pdfBuffer = await backendResponse.arrayBuffer()

    // Forward PDF headers from backend
    const responseHeaders = new Headers()
    const contentType = backendResponse.headers.get('content-type') ?? 'application/pdf'
    responseHeaders.set('Content-Type', contentType)

    const contentDisposition = backendResponse.headers.get('content-disposition')
    if (contentDisposition) {
      responseHeaders.set('Content-Disposition', contentDisposition)
    }

    const contentLength = backendResponse.headers.get('content-length')
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength)
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'NetworkError', message },
      { status: 503 },
    )
  }
}
