'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import { Target, TargetGroup } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, Upload, Save } from 'lucide-react'
import Link from 'next/link'
import Papa from 'papaparse'

export default function TargetGroupDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [group, setGroup] = useState<TargetGroup | null>(null)
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingGroup, setEditingGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', department: '', description: '' })

  const [newTarget, setNewTarget] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
  })
  const [csvError, setCsvError] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const { data: g } = await supabase
      .from('target_groups')
      .select('*')
      .eq('id', id)
      .single()

    if (g) {
      setGroup(g)
      setGroupForm({ name: g.name, department: g.department || '', description: g.description || '' })
    }

    const { data: t } = await supabase
      .from('targets')
      .select('*')
      .eq('group_id', id)
      .eq('is_active', true)
      .order('last_name')

    if (t) setTargets(t)
    setLoading(false)
  }

  async function handleUpdateGroup(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('target_groups')
      .update({
        name: groupForm.name,
        department: groupForm.department || null,
        description: groupForm.description || null,
      })
      .eq('id', id)

    setGroup({ ...group!, name: groupForm.name, department: groupForm.department || null, description: groupForm.description || null })
    setEditingGroup(false)
    setSaving(false)
  }

  async function addTarget() {
    if (!newTarget.email || !newTarget.first_name || !newTarget.last_name) {
      alert('Email, nombre y apellido son obligatorios')
      return
    }

    const { data, error } = await supabase
      .from('targets')
      .upsert(
        {
          email: newTarget.email,
          first_name: newTarget.first_name,
          last_name: newTarget.last_name,
          position: newTarget.position || null,
          department: newTarget.department || null,
          group_id: id as string,
        },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (error) {
      alert('Error al agregar target: ' + error.message)
      return
    }

    if (data) {
      setTargets([...targets, data])
      setNewTarget({ first_name: '', last_name: '', email: '', position: '', department: '' })
    }
  }

  async function deleteTarget(targetId: string) {
    if (!confirm('¿Eliminar este target?')) return
    await supabase.from('targets').update({ is_active: false }).eq('id', targetId)
    setTargets(targets.filter((t) => t.id !== targetId))
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      async complete(results) {
        const rows = results.data as Record<string, string>[]
        const existingEmails = new Set(targets.map((t) => t.email.toLowerCase()))
        const toInsert: {
          email: string
          first_name: string
          last_name: string
          position: string | null
          department: string | null
          group_id: string
        }[] = []

        for (const row of rows) {
          const email = (row.email || '').trim().toLowerCase()
          if (!email || existingEmails.has(email)) continue
          existingEmails.add(email)

          toInsert.push({
            email,
            first_name: (row.first_name || row.nombre || '').trim(),
            last_name: (row.last_name || row.apellido || '').trim(),
            position: (row.position || row.puesto || row.cargo || '').trim() || null,
            department: (row.department || row.departamento || row.area || '').trim() || null,
            group_id: id as string,
          })
        }

        if (toInsert.length === 0) {
          setCsvError('No se encontraron registros nuevos en el CSV.')
          return
        }

        const { error } = await supabase.from('targets').upsert(toInsert, { onConflict: 'email' })
        if (error) {
          setCsvError('Error al importar: ' + error.message)
          return
        }

        // Reload targets
        await loadData()
      },
      error(err) {
        setCsvError('Error al leer el archivo: ' + err.message)
      },
    })

    e.target.value = ''
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (!group) return <div className="p-8 text-center text-red-500">Grupo no encontrado</div>

  return (
    <div>
      <div className="mb-4">
        <Link href="/target-groups" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a grupos
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={group.description || undefined}
        actions={
          <button className="btn-secondary" onClick={() => setEditingGroup(!editingGroup)}>
            {editingGroup ? 'Cancelar' : 'Editar grupo'}
          </button>
        }
      />

      {/* Edit group form */}
      {editingGroup && (
        <form onSubmit={handleUpdateGroup} className="card p-6 mb-6 max-w-lg space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              className="input"
              required
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Departamento</label>
            <input
              type="text"
              className="input"
              value={groupForm.department}
              onChange={(e) => setGroupForm({ ...groupForm, department: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[80px]"
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* Group info bar */}
      <div className="flex items-center gap-6 mb-6 text-sm text-gray-500">
        {group.department && <span>Departamento: <strong className="text-gray-700">{group.department}</strong></span>}
        <span>Targets: <strong className="text-gray-700">{targets.length}</strong></span>
        <span>Creado: {formatDate(group.created_at)}</span>
      </div>

      {/* Add targets section */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Agregar targets</h3>

        {/* CSV import */}
        <div className="flex items-center gap-4 mb-4">
          <label className="btn-secondary cursor-pointer inline-flex">
            <Upload className="h-4 w-4" /> Importar CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVImport} />
          </label>
          <span className="text-xs text-gray-400">Columnas: email, first_name, last_name, position, department</span>
        </div>
        {csvError && <p className="text-xs text-red-600 mb-3">{csvError}</p>}

        {/* Manual add */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <input
            type="text"
            className="input"
            placeholder="Nombre *"
            value={newTarget.first_name}
            onChange={(e) => setNewTarget({ ...newTarget, first_name: e.target.value })}
          />
          <input
            type="text"
            className="input"
            placeholder="Apellido *"
            value={newTarget.last_name}
            onChange={(e) => setNewTarget({ ...newTarget, last_name: e.target.value })}
          />
          <input
            type="email"
            className="input"
            placeholder="Email *"
            value={newTarget.email}
            onChange={(e) => setNewTarget({ ...newTarget, email: e.target.value })}
          />
          <input
            type="text"
            className="input"
            placeholder="Puesto"
            value={newTarget.position}
            onChange={(e) => setNewTarget({ ...newTarget, position: e.target.value })}
          />
          <input
            type="text"
            className="input"
            placeholder="Departamento"
            value={newTarget.department}
            onChange={(e) => setNewTarget({ ...newTarget, department: e.target.value })}
          />
          <button type="button" className="btn-primary" onClick={addTarget}>
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>

      {/* Targets table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Targets del grupo ({targets.length})</h3>
        </div>
        {targets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay targets en este grupo todavía</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Puesto</th>
                  <th className="px-6 py-3">Departamento</th>
                  <th className="px-6 py-3">Agregado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {targets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {t.first_name} {t.last_name}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{t.email}</td>
                    <td className="px-6 py-3 text-gray-500">{t.position || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{t.department || '—'}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{formatDate(t.created_at)}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => deleteTarget(t.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar target"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
