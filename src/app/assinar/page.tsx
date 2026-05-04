import { Suspense } from 'react'
import AssinarClient from './AssinarClient'

export default function AssinarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#6B7280', fontFamily: 'system-ui, sans-serif' }}>Carregando...</span>
      </div>
    }>
      <AssinarClient />
    </Suspense>
  )
}