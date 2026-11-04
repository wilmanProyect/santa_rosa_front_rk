import { todayIso } from '@/shared/lib/format'
import { SelectField, TextAreaField, TextField } from '@/shared/ui'
import { useProducts } from '../hooks/useHealth'
import type { HealthFormValues } from '../lib/health-form'
import {
  DOSE_UNIT_LABELS,
  GENERAL_EVENT_TYPES,
  HEALTH_CATEGORY_LABELS,
  HEALTH_EVENT_CATEGORY,
  HEALTH_EVENT_LABELS,
  ROUTE_LABELS,
  type AdministrationRoute,
  type DoseUnit,
  type HealthCategory,
  type HealthEventType,
} from '../types/health.types'

interface HealthFieldsProps {
  values: HealthFormValues
  onChange(values: HealthFormValues): void
  /** Especie del animal, para ofrecer solo los productos autorizados. */
  species?: 'SHEEP' | 'GOAT'
  /** Fecha mínima (nacimiento del animal). */
  minDate?: string | null
  /** Oculta los eventos generales (sin animal), p. ej. en la ficha o en la aplicación masiva. */
  animalEventsOnly?: boolean
  /** Etiqueta de la dosis cuando es común a varios animales. */
  doseLabel?: string
}

/** Campos de un evento sanitario o de manejo, compartidos por el alta individual y la masiva. */
export function HealthFields({
  values,
  onChange,
  species,
  minDate,
  animalEventsOnly = false,
  doseLabel = 'Dosis',
}: HealthFieldsProps) {
  // Se listan también los inactivos para no perder el producto actual al editar.
  const { data: products } = useProducts()
  const set = <K extends keyof HealthFormValues>(key: K, value: HealthFormValues[K]) =>
    onChange({ ...values, [key]: value })
  const text = (key: keyof HealthFormValues) => (e: { target: { value: string } }) =>
    set(key, e.target.value as never)

  const isGeneral = GENERAL_EVENT_TYPES.includes(values.type)
  const selectedProduct = products?.find((p) => p.id === values.productId)
  const productOptions = (products ?? []).filter(
    (p) =>
      p.id === values.productId ||
      (p.isActive && (!species || (species === 'SHEEP' ? p.forSheep : p.forGoats))),
  )

  const types = (Object.keys(HEALTH_EVENT_LABELS) as HealthEventType[]).filter(
    (t) => !animalEventsOnly || !GENERAL_EVENT_TYPES.includes(t),
  )
  const categories = (Object.keys(HEALTH_CATEGORY_LABELS) as HealthCategory[]).filter((c) =>
    types.some((t) => HEALTH_EVENT_CATEGORY[t] === c),
  )

  function pickProduct(productId: string) {
    const product = products?.find((p) => p.id === productId)
    // Se proponen la unidad y la vía habituales del producto si aún no se eligieron.
    onChange({
      ...values,
      productId,
      doseUnit: values.doseUnit || product?.doseUnit || '',
      route: values.route || product?.defaultRoute || '',
    })
  }

  return (
    <>
      <div className="grid-2">
        <SelectField
          label="Tipo de evento"
          required
          value={values.type}
          onChange={(e) => set('type', e.target.value as HealthEventType)}
        >
          {categories.map((c) => (
            <optgroup key={c} label={HEALTH_CATEGORY_LABELS[c]}>
              {types
                .filter((t) => HEALTH_EVENT_CATEGORY[t] === c)
                .map((t) => (
                  <option key={t} value={t}>
                    {HEALTH_EVENT_LABELS[t]}
                  </option>
                ))}
            </optgroup>
          ))}
        </SelectField>
        <div className="stack stack--sm">
          <TextField
            label="Fecha"
            type="date"
            required
            min={minDate ?? undefined}
            max={todayIso()}
            value={values.appliedAt}
            onChange={text('appliedAt')}
          />
          <label className="checkbox small">
            <input
              type="checkbox"
              checked={values.isDateEstimated}
              onChange={(e) => set('isDateEstimated', e.target.checked)}
            />
            <span>Fecha aproximada (no se anotó)</span>
          </label>
        </div>
      </div>

      {!isGeneral && (
        <>
          <h3 className="form-section-title">Producto</h3>
          <div className="grid-2">
            <SelectField
              label="Producto"
              value={values.productId}
              hint={
                selectedProduct
                  ? selectedProduct.meatWithdrawalDays > 0
                    ? `Retiro de carne: ${selectedProduct.meatWithdrawalDays} días.`
                    : 'Sin retiro de carne.'
                  : species
                    ? 'Solo productos activos autorizados para la especie.'
                    : undefined
              }
              onChange={(e) => pickProduct(e.target.value)}
            >
              <option value="">Sin producto</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {!p.isActive ? ' (inactivo)' : ''}
                </option>
              ))}
            </SelectField>
            <TextField label="Lote del producto" maxLength={50} value={values.productBatch} onChange={text('productBatch')} />
            <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'nowrap' }}>
              <TextField
                label={doseLabel}
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                value={values.doseQuantity}
                onChange={text('doseQuantity')}
                className="flex-1"
              />
              <SelectField
                label="Unidad"
                className="visually-hidden-label"
                value={values.doseUnit}
                onChange={(e) => set('doseUnit', e.target.value as DoseUnit | '')}
              >
                <option value="">{selectedProduct?.doseUnit ? `(${DOSE_UNIT_LABELS[selectedProduct.doseUnit]})` : 'Unidad'}</option>
                {(Object.keys(DOSE_UNIT_LABELS) as DoseUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {DOSE_UNIT_LABELS[u]}
                  </option>
                ))}
              </SelectField>
            </div>
            <SelectField
              label="Vía"
              value={values.route}
              onChange={(e) => set('route', e.target.value as AdministrationRoute | '')}
            >
              <option value="">{selectedProduct?.defaultRoute ? `Habitual del producto (${ROUTE_LABELS[selectedProduct.defaultRoute]})` : 'Sin especificar'}</option>
              {(Object.keys(ROUTE_LABELS) as AdministrationRoute[]).map((r) => (
                <option key={r} value={r}>
                  {ROUTE_LABELS[r]}
                </option>
              ))}
            </SelectField>
            <TextField
              className="span-2"
              label="Enfermedad u objetivo"
              placeholder="Clostridiosis, neumonía…"
              maxLength={150}
              value={values.targetCondition}
              onChange={text('targetCondition')}
            />
          </div>
        </>
      )}

      <h3 className="form-section-title">Detalles</h3>
      <div className="grid-2">
        <TextField label="Aplicado por" placeholder="Veterinario o responsable" maxLength={150} value={values.appliedBy} onChange={text('appliedBy')} />
        <TextField
          label="Lugar"
          placeholder="Corral o potrero"
          hint={isGeneral ? 'Corral o instalación donde se hizo.' : undefined}
          maxLength={100}
          value={values.location}
          onChange={text('location')}
        />
        {!isGeneral && (
          <TextField
            label="Próxima dosis o refuerzo"
            hint="Aparecerá en los recordatorios."
            type="date"
            min={values.appliedAt || undefined}
            value={values.nextDoseAt}
            onChange={text('nextDoseAt')}
          />
        )}
        <TextField
          label="Costo"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={values.cost}
          onChange={text('cost')}
        />
        <TextAreaField className="span-2" label="Observaciones" maxLength={1000} value={values.notes} onChange={text('notes')} />
      </div>
    </>
  )
}
