import { data } from 'react-router'
import { generateQrCodeServer } from '../business/qr/qr.server'
import type { Route } from './+types/api.qr.generate'

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({ success: false, error: { message: 'Method not allowed' } }, { status: 405 })
  }

  try {
    const body = await request.json()
    const { content, config } = body

    if (!content || typeof content !== 'string') {
      return data({ 
        success: false, 
        error: { message: 'Content is required and must be a string' } 
      }, { status: 400 })
    }

    const result = await generateQrCodeServer(content, config || {})

    if (!result.success) {
      return data({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }

    return data({ 
      success: true, 
      data: result.data,
      fromCache: false 
    })
    
  } catch (error) {
    console.error('QR generation error:', error)
    return data({ 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'GENERATION_ERROR'
      } 
    }, { status: 500 })
  }
}

// Handle GET requests too (though the hook uses POST)
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const content = url.searchParams.get('content')
  const configParam = url.searchParams.get('config')
  
  if (!content) {
    return data({ 
      success: false, 
      error: { message: 'Content query parameter is required' } 
    }, { status: 400 })
  }

  try {
    let config = {}
    if (configParam) {
      config = JSON.parse(configParam)
    }

    const result = await generateQrCodeServer(content, config)

    if (!result.success) {
      return data({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }

    return data({ 
      success: true, 
      data: result.data,
      fromCache: false 
    })
    
  } catch (error) {
    console.error('QR generation error:', error)
    return data({ 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'GENERATION_ERROR'
      } 
    }, { status: 500 })
  }
}