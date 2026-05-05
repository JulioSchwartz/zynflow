import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/landing.html') {
    return NextResponse.redirect(new URL('/', req.url), 301)
  }
}

export const config = {
  matcher: '/landing.html',
}