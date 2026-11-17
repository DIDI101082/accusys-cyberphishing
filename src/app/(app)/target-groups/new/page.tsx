'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import { Upload, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Papa from 'papaparse'

interface NewTarget {
  first_name: string
  last_name: string
  email: string
  position: string
  department: string
}

export default function NewTargetGroupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'group' | 'targets'>('group')
  const [groupId, setGroupId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    department: '',
    description: '',
  })

  const [targets, setTargets] = useState<NewTarget[]>([])
  const [newTarget, setNewTarget] = useState<NewTarget>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
  })
  const [csvError, setCsvError] = useState('')

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data, error } = await supabase
      .from('target_groups')
      .insert({
        name: form.name,
        department: form.department || null,
        description: form.description || null,
      })
      .select()
      .single()

    if (error || !data) {
      alert('Error al crear el grupo: ' + error?.message)
      setSaving(false)
      return
    }

    setGroupId(data.id)
    setStep('targets')
    setSaving(false)
  }

  function addTarget() {
    if (!newTarget.email || !newTarget.first_name || !newTarget.last_name) {
      alert('Email, nombre y apellido son obligatorios')
      return
    }
    if (targets.some((t) => t.email.toLowerCase() === newTarget.email.toLowerCase())) {
      alert('Ese email ya está en la lista')
      return
    }
    setTargets([...targets, { ...newTarget }])
    setNewTarget({ first_name: '', last_name: '', email: '', position: '', department: '' })
  }

  function removeTarget(index: number) {
    setTargets(targets.filter((_, i) => i !== index))
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as Record<string, string>[]
        const imported: NewTarget[] = []
        const existingEmails = new Set(targets.map((t) => t.email.toLowerCase()))

        for (const row of rows) {
          const email = (row.email || '').trim().toLowerCase()
          if (!email) continue
          if (existingEmails.has(email)) continue
          existingEmails.add(email)

          imported.push({
            email,
            first_name: (row.first_name || row.nombre || '').trim(),
            last_name: (row.last_name || row.apellido || '').trim(),
            position: (row.position || row.puesto || row.cargo || '').trim(),
            department: (row.department || row.departamento || row.area || '').trim(),
          })
        }

        if (imported.length === 0) {
          setCsvError('No se encontraron registros válidos en el CSV. Asegurate de que tenga columnas: email, first_name, last_name, position, department')
          return
        }

        setTargets([...targets, ...imported])
      },
      error(err) {
        setCsvError('Error al leer el archivo: ' + err.message)
      },
    })

    // Reset input
    e.target.value = ''
  }

  async function handleSaveTargets() {
    if (!groupId || targets.length === 0) return
    setSaving(true)

    const rows = targets.map((t) => ({
      email: t.email,
      first_name: t.first_name,
      last_name: t.last_name,
      position: t.position || null,
      department: t.department || null,
      group_id: groupId,
    }))

    const { error } = await supabase.from('targets').upsert(rows, { onConflict: 'email' })

    if (error) {
      alert('Error al guardar targets: ' + error.message)
      setSaving(false)
      return
    }

    router.push(`/target-groups/${groupId}`)
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/target-groups" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a grupos
        </Link>
      </div>

      <PageHeader
        title="Nuevo grupo de targets"
        description={step === 'group' ? 'Configurá los datos del grupo' : 'Agregá targets al grupo'}
      />

      {step === 'group' && (
        <form onSubmit={handleCreateGroup} className="max-w-lg space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Nombre del grupo *</label>
              <input
                type="text"
                className="input"
                required
                placeholder="Ej: Empleados Administración"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Departamento</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: Administración"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="Descripción opcional..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear grupo y agregar targets'}
            </button>
          </div>
        </form>
      )}

      {step === 'targets' && (
        <div className="space-y-6 max-w-4xl">
          {/* CSV Import */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Importar desde CSV</h3>
            <p className="text-xs text-gray-500 mb-3">
              El archivo debe tener columnas: <code className="bg-gray-100 px-1 rounded">email, first_name, last_name, position, department</code>
            </p>
            <label className="btn-secondary cursor-pointer inline-flex">
              <Upload className="h-4 w-4" /> Seleccionar archivo CSV
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVImport} />
            </label>
            {csvError && <p className="text-xs text-red-600 mt-2">{csvError}</p>}
          </div>

          {/* Manual add */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agregar target manualmente</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
              <button type="button" className="btn-primary" onClick={addTarget}>
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Targets list */}
          {targets.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{targets.length} targets para agregar</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Puesto</th>
                      <th className="px-6 py-3">Departamento</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {targets.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{t.first_name} {t.last_name}</td>
                        <td className="px-6 py-3 text-gray-500">{t.email}</td>
                        <td className="px-6 py-3 text-gray-500">{t.position || '—'}</td>
                        <td className="px-6 py-3 text-gray-500">{t.department || '—'}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => removeTarget(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push(`/target-groups/${groupId}`)}
            >
              Omitir por ahora
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving || targets.length === 0}
              onClick={handleSaveTargets}
            >
              {saving ? 'Guardando...' : `Guardar ${targets.length} targets`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
