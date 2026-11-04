import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { nullable, optional } from '@/shared/lib/format'
import { Alert, Button, Dialog, SelectField, TextAreaField, TextField, useToast } from '@/shared/ui'
import { useSaveProduct } from '../hooks/useHealth'
import {
  DOSE_UNIT_LABELS,
  PRODUCT_CATEGORY_LABELS,
  ROUTE_LABELS,
  type AdministrationRoute,
  type DoseUnit,
  type ProductCategory,
  type ProductRequest,
  type VeterinaryProduct,
} from '../types/health.types'

const MAX_WITHDRAWAL_DAYS = 365

interface ProductFormDialogProps {
  open: boolean
  product: VeterinaryProduct | null
  onClose(): void
}

export function ProductFormDialog({ open, product, onClose }: ProductFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto veterinario'}
      description="Los días de retiro se copian al registrar cada aplicación: cambiarlos aquí no modifica el historial."
      size="lg"
      bare
    >
      <ProductForm key={product?.id ?? 'new'} product={product} onDone={onClose} />
    </Dialog>
  )
}

const TEXT_FIELDS = [
  'activeIngredient',
  'concentration',
  'manufacturer',
  'presentation',
  'dosageInstructions',
  'notes',
] as const

type TextKey = (typeof TEXT_FIELDS)[number]

function ProductForm({ product, onDone }: { product: VeterinaryProduct | null; onDone(): void }) {
  const toast = useToast()
  const save = useSaveProduct()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(product?.name ?? '')
  const [category, setCategory] = useState<ProductCategory | ''>(product?.category ?? '')
  const [texts, setTexts] = useState<Record<TextKey, string>>(() =>
    Object.fromEntries(TEXT_FIELDS.map((k) => [k, product?.[k] ?? ''])) as Record<TextKey, string>,
  )
  const [doseUnit, setDoseUnit] = useState<DoseUnit | ''>(product?.doseUnit ?? '')
  const [route, setRoute] = useState<AdministrationRoute | ''>(product?.defaultRoute ?? '')
  const [forSheep, setForSheep] = useState(product?.forSheep ?? true)
  const [forGoats, setForGoats] = useState(product?.forGoats ?? true)
  const [meatDays, setMeatDays] = useState(String(product?.meatWithdrawalDays ?? 0))
  const [milkDays, setMilkDays] = useState(product?.milkWithdrawalDays != null ? String(product.milkWithdrawalDays) : '')
  const [prescription, setPrescription] = useState(product?.requiresPrescription ?? false)
  const [refrigeration, setRefrigeration] = useState(product?.requiresRefrigeration ?? false)

  const text = (key: TextKey) => (e: { target: { value: string } }) =>
    setTexts((t) => ({ ...t, [key]: e.target.value }))

  function buildBody(): ProductRequest {
    const all: ProductRequest = {
      name: name.trim(),
      category: category as ProductCategory,
      doseUnit: doseUnit || null,
      defaultRoute: route || null,
      forSheep,
      forGoats,
      meatWithdrawalDays: Number(meatDays || 0),
      milkWithdrawalDays: milkDays === '' ? null : Number(milkDays),
      requiresPrescription: prescription,
      requiresRefrigeration: refrigeration,
    }
    for (const key of TEXT_FIELDS) all[key] = nullable(texts[key])

    if (!product) {
      // Alta: sin nulls (el backend no los acepta en POST); se omiten los vacíos.
      const body: ProductRequest = {}
      for (const [key, value] of Object.entries(all)) {
        if (value !== null && value !== '') (body as Record<string, unknown>)[key] = value
      }
      for (const key of TEXT_FIELDS) body[key] = optional(texts[key])
      return body
    }
    // Edición: solo lo modificado.
    const body: ProductRequest = {}
    for (const [key, value] of Object.entries(all) as [keyof ProductRequest, unknown][]) {
      const current = product[key as keyof VeterinaryProduct] ?? null
      if (value !== current) (body as Record<string, unknown>)[key] = value
    }
    return body
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!forSheep && !forGoats) {
      setError('Marque al menos una especie autorizada.')
      return
    }
    const body = buildBody()
    if (product && Object.keys(body).length === 0) {
      onDone()
      return
    }
    save.mutate(
      { id: product?.id, body },
      {
        onSuccess: (saved) => {
          toast.show(product ? 'Producto actualizado' : `Producto "${saved.name}" creado`)
          onDone()
        },
      },
    )
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body">
        {(error || save.isError) && <Alert tone="error">{error ?? getErrorMessage(save.error)}</Alert>}

        <h3 className="form-section-title">Producto</h3>
        <div className="grid-2">
          <TextField
            label="Nombre comercial"
            required
            maxLength={150}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField
            label="Categoría"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
          >
            <option value="" disabled>
              Seleccione la categoría
            </option>
            {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((c) => (
              <option key={c} value={c}>
                {PRODUCT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </SelectField>
          <TextField label="Principio activo" maxLength={150} value={texts.activeIngredient} onChange={text('activeIngredient')} />
          <TextField label="Concentración" placeholder="1 %" maxLength={50} value={texts.concentration} onChange={text('concentration')} />
          <TextField label="Laboratorio" maxLength={100} value={texts.manufacturer} onChange={text('manufacturer')} />
          <TextField label="Presentación" placeholder="Frasco 500 ml" maxLength={100} value={texts.presentation} onChange={text('presentation')} />
        </div>

        <h3 className="form-section-title">Aplicación</h3>
        <div className="grid-2">
          <SelectField label="Unidad de dosis" hint="Se usa por defecto al registrar una aplicación." value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as DoseUnit | '')}>
            <option value="">Sin unidad</option>
            {(Object.keys(DOSE_UNIT_LABELS) as DoseUnit[]).map((u) => (
              <option key={u} value={u}>
                {DOSE_UNIT_LABELS[u]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Vía habitual" value={route} onChange={(e) => setRoute(e.target.value as AdministrationRoute | '')}>
            <option value="">Sin vía</option>
            {(Object.keys(ROUTE_LABELS) as AdministrationRoute[]).map((r) => (
              <option key={r} value={r}>
                {ROUTE_LABELS[r]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            className="span-2"
            label="Indicaciones de dosis"
            placeholder="1 ml cada 50 kg"
            maxLength={500}
            rows={2}
            value={texts.dosageInstructions}
            onChange={text('dosageInstructions')}
          />
          <div className="field span-2">
            <span className="field__label-text">Especies autorizadas</span>
            <div className="row" style={{ gap: 18 }}>
              <label className="checkbox">
                <input type="checkbox" checked={forSheep} onChange={(e) => setForSheep(e.target.checked)} />
                <span>Ovinos</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={forGoats} onChange={(e) => setForGoats(e.target.checked)} />
                <span>Caprinos</span>
              </label>
            </div>
          </div>
        </div>

        <h3 className="form-section-title">Retiro y cuidados</h3>
        <div className="grid-2">
          <TextField
            label="Días de retiro de carne"
            hint="Tras la aplicación, no se puede faenar durante este período."
            type="number"
            min={0}
            max={MAX_WITHDRAWAL_DAYS}
            step={1}
            required
            value={meatDays}
            onChange={(e) => setMeatDays(e.target.value)}
          />
          <TextField
            label="Días de retiro de leche"
            hint="Opcional (caprinos)."
            type="number"
            min={0}
            max={MAX_WITHDRAWAL_DAYS}
            step={1}
            value={milkDays}
            onChange={(e) => setMilkDays(e.target.value)}
          />
          <label className="checkbox">
            <input type="checkbox" checked={prescription} onChange={(e) => setPrescription(e.target.checked)} />
            <span>Requiere receta</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={refrigeration} onChange={(e) => setRefrigeration(e.target.checked)} />
            <span>Requiere refrigeración</span>
          </label>
          <TextAreaField className="span-2" label="Observaciones" maxLength={1000} value={texts.notes} onChange={text('notes')} />
        </div>
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </footer>
    </form>
  )
}
