import { useState } from 'react'
import { Can, useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  useToast,
} from '@/shared/ui'
import { ProductFormDialog } from '../components/ProductFormDialog'
import { useDeleteProduct, useProducts, useSaveProduct } from '../hooks/useHealth'
import {
  DOSE_UNIT_LABELS,
  PRODUCT_CATEGORY_LABELS,
  ROUTE_LABELS,
  type ProductCategory,
  type VeterinaryProduct,
} from '../types/health.types'

/** Catálogo de productos veterinarios. Ver requiere health:read; administrar, veterinary-products:manage. */
export function VeterinaryProductsPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [active, setActive] = useState<'' | 'true' | 'false'>('true')
  const debounced = useDebouncedValue(search, 300)
  const { data: products, isPending, isError, error } = useProducts({
    search: debounced || undefined,
    category: category || undefined,
    isActive: active ? active === 'true' : undefined,
  })
  const save = useSaveProduct()
  const remove = useDeleteProduct()
  const [editing, setEditing] = useState<VeterinaryProduct | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<VeterinaryProduct | null>(null)
  const canManage = can(PERMISSIONS.VETERINARY_PRODUCTS_MANAGE)

  return (
    <>
      <PageHeader
        eyebrow="Sanidad"
        title="Productos veterinarios"
        description="Vacunas, antiparasitarios y demás productos que se aplican. Los días de retiro bloquean la faena tras cada aplicación."
        actions={
          <Can permissions={[PERMISSIONS.VETERINARY_PRODUCTS_MANAGE]}>
            <Button
              icon="plus"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Nuevo producto
            </Button>
          </Can>
        }
      />

      <div className="toolbar">
        <div className="input-icon toolbar__search">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            placeholder="Buscar por nombre o principio activo"
            aria-label="Buscar productos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SelectField
          label="Categoría"
          className="visually-hidden-label"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory | '')}
        >
          <option value="">Todas las categorías</option>
          {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={active}
          onChange={(e) => setActive(e.target.value as typeof active)}
        >
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
          <option value="">Activos e inactivos</option>
        </SelectField>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {products && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Dosis y vía</th>
                <th>Especies</th>
                <th>Retiro de carne</th>
                <th>Estado</th>
                {canManage && (
                  <th className="table__actions">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="table__empty">
                    <div className="empty">
                      <Icon name="shield" size={28} />
                      No hay productos que coincidan con los filtros.
                    </div>
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="table__primary">{p.name}</span>
                    {(p.activeIngredient || p.concentration) && (
                      <div className="muted small">
                        {[p.activeIngredient, p.concentration].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className="row" style={{ gap: 4, marginTop: 2 }}>
                      {p.requiresPrescription && <Badge tone="info">Con receta</Badge>}
                      {p.requiresRefrigeration && <Badge tone="info">Refrigerar</Badge>}
                    </div>
                  </td>
                  <td>{PRODUCT_CATEGORY_LABELS[p.category]}</td>
                  <td className="small">
                    {p.dosageInstructions ?? (p.doseUnit ? DOSE_UNIT_LABELS[p.doseUnit] : '—')}
                    {p.defaultRoute && <div className="muted">{ROUTE_LABELS[p.defaultRoute]}</div>}
                  </td>
                  <td className="small">
                    {[p.forSheep && 'Ovinos', p.forGoats && 'Caprinos'].filter(Boolean).join(' y ')}
                  </td>
                  <td>
                    {p.meatWithdrawalDays > 0 ? (
                      <Badge tone="warning">{p.meatWithdrawalDays} días</Badge>
                    ) : (
                      <span className="muted">Sin retiro</span>
                    )}
                    {p.milkWithdrawalDays != null && (
                      <div className="muted small">Leche: {p.milkWithdrawalDays} días</div>
                    )}
                  </td>
                  <td>
                    {p.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}
                  </td>
                  {canManage && (
                    <td className="table__actions">
                      <div className="row">
                        <button
                          type="button"
                          className="icon-btn"
                          title={p.isActive ? 'Desactivar' : 'Activar'}
                          aria-label={`${p.isActive ? 'Desactivar' : 'Activar'} ${p.name}`}
                          disabled={save.isPending}
                          onClick={() =>
                            save.mutate(
                              { id: p.id, body: { isActive: !p.isActive } },
                              {
                                onSuccess: (s) =>
                                  toast.show(`"${s.name}" ${s.isActive ? 'activado' : 'desactivado'}`),
                                onError: (err) => toast.show(getErrorMessage(err), 'error'),
                              },
                            )
                          }
                        >
                          <Icon name="power" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar"
                          aria-label={`Editar ${p.name}`}
                          onClick={() => {
                            setEditing(p)
                            setFormOpen(true)
                          }}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Eliminar"
                          aria-label={`Eliminar ${p.name}`}
                          onClick={() => {
                            remove.reset()
                            setDeleting(p)
                          }}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormDialog open={formOpen} product={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar producto"
        message={
          <>
            ¿Eliminar <strong>{deleting?.name}</strong>? Solo se puede si no figura en ningún registro
            sanitario; si no, desactívelo para que no se use en aplicaciones nuevas.
          </>
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.show(`"${deleting.name}" eliminado`)
              setDeleting(null)
            },
          })
        }
      />
    </>
  )
}
