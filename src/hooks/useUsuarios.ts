'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Usuario {
  id: number
  email: string
  user_id: string
  nome: string | null
  plano: string
  status: string
  trial_ends_at: string | null
}

export function useUsuario() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('usuarios_flow')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUsuario(data)
      setLoading(false)
    }
    carregar()
  }, [])

  return { usuario, loading }
}