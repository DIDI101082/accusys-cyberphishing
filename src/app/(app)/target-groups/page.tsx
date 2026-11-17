'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { Users, Plus, Trash2 } from 'lucide-react'
import { TargetGroup } from '@/types/database'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface GroupWithCount extends TargetGroup {
  target_count: number
}

export default function TargetGroupsPage() {
  const [groups, setGroups] = useState<GroupWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    const { data } = await supabase
      .from('target_groups')
      .select('*, targets(count)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setGroups(
        data.map((g: any) => ({
          ...g,
          target_count: g.targets?.[0]?.count || 0,
        }))
      )
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este grupo? Los targets asociados quedarán sin grupo.')) return
    await supabase.from('target_groups').update({ is_active: false }).eq('id', id)
    setGroups(groups.filter((g) => g.id !== id))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <PageHeader
        title="Grupos & Targets"
        description="Gestioná los grupos de usuarios para las campañas de phishing"
        actions={
          <Link href="/target-groups/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo grupo
          </Link>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin grupos"
          description="Creá un grupo de targets para poder lanzar campañas de phishing simulado."
          action={{ label: 'Crear grupo', href: '/target-groups/new' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <Link
                      href={`/target-groups/${g.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-600"
                    >
                      {g.name}
                    </Link>
                    {g.department && (
                      <p className="text-xs text-gray-500">{g.department}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Eliminar grupo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {g.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{g.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-700">
                  {g.target_count} {g.target_count === 1 ? 'target' : 'targets'}
                </span>
                <span className="text-xs text-gray-400">{formatDate(g.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
