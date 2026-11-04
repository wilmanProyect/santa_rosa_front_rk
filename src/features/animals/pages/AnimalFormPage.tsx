import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { todayIso } from '@/shared/lib/format'
import {
  Alert,
  Button,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { DuplicateIdentifierAlert, ExceptionReasonDialog } from '../components/DuplicateIdentifier'
import { ParentPicker } from '../components/ParentPicker'
import { QuickColorDialog, QuickExternalSireDialog } from '../components/QuickCreateDialogs'
import { useAnimal, useCreateAnimal, useUpdateAnimal } from '../hooks/useAnimals'
import { useBreeds, useColors } from '../hooks/useCatalogs'
import { animalLabel } from '../lib/animal-label'
import {
  buildCreateRequest,
  buildUpdateRequest,
  EMPTY_ANIMAL_FORM,
  toFormValues,
  MISSING_EAR_TAG,
  validateAnimal,
  type AnimalFormValues,
} from '../lib/animal-form'
import { ANIMALS_ROUTES } from '../routes'
import {
  ANIMAL_ERROR_CODES,
  ENTRY_ORIGIN_LABELS,
  GENETIC_CATEGORY_LABELS,
  SPECIES_LABELS,
  type AnimalDetail,
  type DuplicateIdentifierBody,
  type EntryOrigin,
  type GeneticCategory,
  type Sex,
  type Species,
} from '../types/animal.types'
import './animals.css'

/** Alta (`/animales/nuevo`, `?externo=1` para reproductor externo) y edición de animales. */
export function AnimalFormPage() {
  const { animalId } = useParams()
  const [searchParams] = useSearchParams()
  const { data: animal, isPending, isError, error } = useAnimal(animalId)

  if (animalId && isError) return <Alert tone="error">{getErrorMessage(error)}</Alert>
  if (animalId && isPending) return <Spinner />

  const isExternal = animal ? animal.isExternal : searchParams.get('externo') === '1'
  return <AnimalForm key={animal?.id ?? `new-${isExternal}`} animal={animal ?? null} isExternal={isExternal} />
}

const upper = (value: string) => value.toUpperCase()

function isDuplicate(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === ANIMAL_ERROR_CODES.DUPLICATE_IDENTIFIER ||
      error.code === ANIMAL_ERROR_CODES.DUPLICATE_EAR_TAG_AND_ABSID)
  )
}

function AnimalForm({ animal, isExternal }: { animal: AnimalDetail | null; isExternal: boolean }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const create = useCreateAnimal()
  const update = useUpdateAnimal()
  const saving = create.isPending || update.isPending

  const [initial] = useState<AnimalFormValues>(() => (animal ? toFormValues(animal) : EMPTY_ANIMAL_FORM))
  const [values, setValues] = useState<AnimalFormValues>(initial)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<DuplicateIdentifierBody | null>(null)
  // Motivo pedido para registrar un caso especial: por identificador repetido o por falta de arete.
  const [askReason, setAskReason] = useState<'duplicate' | 'missingEarTag' | null>(null)
  const [quickSire, setQuickSire] = useState(false)
  const [quickColor, setQuickColor] = useState(false)

  const { data: breeds } = useBreeds(
    { species: values.species || undefined, isActive: true },
    { enabled: !!values.species },
  )
  const { data: colors } = useColors({ isActive: true })

  // Al editar, la raza o el color actuales pueden estar inactivos: se agregan como opción.
  const breedOptions = [...(breeds ?? [])]
  if (animal && animal.species === values.species && !breedOptions.some((b) => b.id === animal.breed.id)) {
    breedOptions.unshift({ ...animal.breed, species: animal.species, isActive: false } as (typeof breedOptions)[number])
  }
  const colorOptions = [...(colors ?? [])]
  if (animal?.color && !colorOptions.some((c) => c.id === animal.color!.id)) {
    colorOptions.unshift({ ...animal.color, isActive: false } as (typeof colorOptions)[number])
  }

  function set<K extends keyof AnimalFormValues>(key: K, value: AnimalFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    if (key === 'earTag' || key === 'absidRegistry') setConflict(null)
  }
  const text = (key: keyof AnimalFormValues, transform = (v: string) => v) =>
    (e: { target: { value: string } }) => set(key, transform(e.target.value) as never)

  function save(overrides: Partial<AnimalFormValues> = {}) {
    const form = { ...values, ...overrides }
    const problem = validateAnimal(form, isExternal)
    if (problem === MISSING_EAR_TAG) {
      setError(null)
      setAskReason('missingEarTag')
      return
    }
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setConflict(null)

    const handlers = {
      onSuccess: (saved: AnimalDetail) => {
        setAskReason(null)
        toast.show(animal ? 'Cambios guardados' : `${isExternal ? 'Reproductor' : 'Animal'} registrado`)
        navigate(ANIMALS_ROUTES.detail(saved.id), { replace: true })
      },
      onError: (err: unknown) => {
        setAskReason(null)
        if (isDuplicate(err)) setConflict(err.body as unknown as DuplicateIdentifierBody)
        else setError(getErrorMessage(err))
      },
    }

    if (animal) {
      const body = buildUpdateRequest(initial, form, isExternal)
      if (Object.keys(body).length === 0) {
        navigate(ANIMALS_ROUTES.detail(animal.id))
        return
      }
      update.mutate({ id: animal.id, body }, handlers)
    } else {
      create.mutate(buildCreateRequest(form, isExternal), handlers)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    save()
  }

  const conflictFields = conflict?.fields ?? []
  const backTo = animal ? ANIMALS_ROUTES.detail(animal.id) : ANIMALS_ROUTES.list
  const title = animal
    ? `Editar ${animalLabel(animal)}`
    : isExternal
      ? 'Registrar reproductor externo'
      : 'Registrar animal'

  return (
    <>
      <form onSubmit={handleSubmit}>
        <PageHeader
          eyebrow={
            <Link to={backTo}>
              <Icon name="arrowLeft" size={14} /> {animal ? animalLabel(animal) : 'Animales'}
            </Link>
          }
          title={title}
          description={
            isExternal
              ? 'Reproductor ajeno a la cabaña (p. ej. donante de semen). Solo existe para la genealogía.'
              : 'Animal del inventario de la cabaña.'
          }
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate(backTo)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" icon="check" loading={saving}>
                {animal ? 'Guardar cambios' : 'Registrar'}
              </Button>
            </>
          }
        />

        <div className="form-sections">
          {error && <Alert tone="error">{error}</Alert>}
          {conflict && (
            <DuplicateIdentifierAlert conflict={conflict} onRegisterException={() => setAskReason('duplicate')} />
          )}

          <Section title="Identificación">
            <div className="grid-2">
              <TextField
                label="Arete"
                hint={
                  isExternal
                    ? undefined
                    : 'Si el animal no tiene arete registrado, se guardará como caso especial.'
                }
                maxLength={30}
                className={conflictFields.includes('earTag') ? 'field--invalid' : undefined}
                value={values.earTag}
                onChange={text('earTag', upper)}
                autoFocus={!animal}
              />
              <TextField label="Nombre" maxLength={100} value={values.name} onChange={text('name')} />
              <SelectField
                label="Especie"
                required
                value={values.species}
                onChange={(e) =>
                  // La raza y los padres dependen de la especie: se limpian al cambiarla.
                  setValues((v) => ({
                    ...v,
                    species: e.target.value as Species,
                    breedId: '',
                    dam: null,
                    sire: null,
                  }))
                }
              >
                <option value="" disabled>
                  Seleccione la especie
                </option>
                {(Object.keys(SPECIES_LABELS) as Species[]).map((s) => (
                  <option key={s} value={s}>
                    {SPECIES_LABELS[s]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Raza"
                required
                disabled={!values.species}
                value={values.breedId}
                onChange={text('breedId')}
              >
                <option value="" disabled>
                  {values.species ? 'Seleccione la raza' : 'Elija primero la especie'}
                </option>
                {breedOptions.map((breed) => (
                  <option key={breed.id} value={breed.id}>
                    {breed.name}
                    {!breed.isActive ? ' (inactiva)' : ''}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Sexo"
                required
                value={values.sex}
                onChange={(e) => set('sex', e.target.value as Sex)}
              >
                <option value="" disabled>
                  Seleccione el sexo
                </option>
                <option value="FEMALE">Hembra</option>
                <option value="MALE">Macho</option>
              </SelectField>
              <div className="stack stack--sm">
                <SelectField label="Color" value={values.colorId} onChange={text('colorId')}>
                  <option value="">Sin color</option>
                  {colorOptions.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name}
                      {!color.isActive ? ' (inactivo)' : ''}
                    </option>
                  ))}
                </SelectField>
                {can(PERMISSIONS.ANIMAL_CATALOGS_MANAGE) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="plus"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setQuickColor(true)}
                  >
                    Nuevo color
                  </Button>
                )}
              </div>
              <SelectField
                label="Categoría genética"
                hint={isExternal ? undefined : 'Opcional: se puede completar después.'}
                value={values.geneticCategory}
                onChange={(e) => set('geneticCategory', e.target.value as GeneticCategory | '')}
              >
                <option value="">Sin clasificar</option>
                {(Object.keys(GENETIC_CATEGORY_LABELS) as GeneticCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {GENETIC_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </SelectField>
            </div>
            {isExternal && (
              <p className="muted small m-0" style={{ marginTop: 12 }}>
                Un reproductor externo necesita al menos uno de: arete, nombre, registro ABSID o
                registro externo.
              </p>
            )}
          </Section>

          <Section title="Registros" description="Se guardan en mayúsculas.">
            <div className="grid-2">
              <TextField
                label="Registro ABSID"
                maxLength={50}
                className={conflictFields.includes('absidRegistry') ? 'field--invalid' : undefined}
                value={values.absidRegistry}
                onChange={text('absidRegistry', upper)}
              />
              <TextField
                label="Código del certificado ABSID"
                hint="El archivo escaneado se adjunta desde la ficha."
                maxLength={50}
                value={values.absidCertificateCode}
                onChange={text('absidCertificateCode', upper)}
              />
              <TextField
                label="Registro externo"
                hint="Registro en otra entidad o código del reproductor en el centro de semen."
                maxLength={100}
                value={values.externalRegistry}
                onChange={text('externalRegistry', upper)}
              />
            </div>
          </Section>

          {animal?.identifierException && (
            <Section
              title="Caso especial"
              description="Arete o registro ABSID repetido, conservado por política de la cabaña."
            >
              <div className="stack">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={values.identifierException}
                    onChange={(e) => set('identifierException', e.target.checked)}
                  />
                  {values.identifierException
                    ? 'Marcado como caso especial'
                    : 'Se quitará la marca (si el dato sigue repetido, el sistema lo rechazará)'}
                </label>
                {values.identifierException && (
                  <TextAreaField
                    label="Motivo"
                    required
                    maxLength={500}
                    value={values.identifierExceptionReason}
                    onChange={text('identifierExceptionReason')}
                  />
                )}
              </div>
            </Section>
          )}

          <Section
            title="Genealogía"
            description="Madre hembra y padre macho de la misma especie, nacidos antes que la cría."
          >
            <div className="grid-2">
              <ParentPicker
                label="Madre"
                species={values.species}
                sex="FEMALE"
                value={values.dam}
                excludeId={animal?.id}
                onChange={(dam) => set('dam', dam)}
              />
              <div className="stack stack--sm">
                <ParentPicker
                  label="Padre"
                  species={values.species}
                  sex="MALE"
                  includeExternal
                  value={values.sire}
                  excludeId={animal?.id}
                  onChange={(sire) => set('sire', sire)}
                />
                {can(PERMISSIONS.ANIMALS_CREATE) && values.species && !values.sire && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="plus"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setQuickSire(true)}
                  >
                    Registrar reproductor externo
                  </Button>
                )}
              </div>
            </div>
          </Section>

          <Section
            title="Nacimiento"
            description="Los pesos (al nacer, al destete y los controles) se registran en la pestaña Pesajes de la ficha."
          >
            <div className="grid-2">
              <TextField
                label="Fecha de nacimiento"
                type="date"
                max={todayIso()}
                required={!isExternal && values.entryOrigin === 'BORN_ON_FARM'}
                value={values.birthDate}
                onChange={text('birthDate')}
              />
            </div>
          </Section>

          {isExternal ? (
            <Section title="Procedencia">
              <TextField
                label="Cabaña o centro de semen de origen"
                maxLength={150}
                value={values.sourceFarm}
                onChange={text('sourceFarm')}
              />
            </Section>
          ) : (
            <Section title="Ingreso a la cabaña">
              <div className="stack">
                <div className="segmented-choice" role="radiogroup" aria-label="Origen">
                  {(Object.keys(ENTRY_ORIGIN_LABELS) as EntryOrigin[]).map((origin) => (
                    <label key={origin} className="checkbox choice">
                      <input
                        type="radio"
                        name="entryOrigin"
                        checked={values.entryOrigin === origin}
                        onChange={() => set('entryOrigin', origin)}
                      />
                      <span>{ENTRY_ORIGIN_LABELS[origin]}</span>
                    </label>
                  ))}
                </div>
                {values.entryOrigin !== 'BORN_ON_FARM' && (
                  <div className="grid-2">
                    <TextField
                      label="Fecha de ingreso"
                      hint="Si se conoce."
                      type="date"
                      min={values.birthDate || undefined}
                      max={todayIso()}
                      value={values.entryDate}
                      onChange={text('entryDate')}
                    />
                    <TextField
                      label="Cabaña de procedencia"
                      maxLength={150}
                      value={values.sourceFarm}
                      onChange={text('sourceFarm')}
                    />
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Observaciones">
            <TextAreaField
              label="Notas"
              className="visually-hidden-label"
              maxLength={1000}
              rows={4}
              value={values.notes}
              onChange={text('notes')}
            />
          </Section>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => navigate(backTo)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" icon="check" loading={saving}>
              {animal ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </div>
      </form>

      {/* Los diálogos tienen sus propios formularios: van fuera del <form> principal. */}
      <ExceptionReasonDialog
        open={askReason !== null}
        loading={saving}
        description={
          askReason === 'missingEarTag'
            ? 'El animal no tiene arete registrado. Se guardará como caso especial y quedará marcado para revisión.'
            : undefined
        }
        defaultReason={askReason === 'missingEarTag' ? 'Sin arete registrado en la planilla de la cabaña' : undefined}
        onClose={() => setAskReason(null)}
        onConfirm={(reason) => {
          setValues((v) => ({ ...v, identifierException: true, identifierExceptionReason: reason }))
          save({ identifierException: true, identifierExceptionReason: reason })
        }}
      />
      {values.species && (
        <QuickExternalSireDialog
          open={quickSire}
          species={values.species}
          onClose={() => setQuickSire(false)}
          onCreated={(sire) => set('sire', sire)}
        />
      )}
      <QuickColorDialog
        open={quickColor}
        onClose={() => setQuickColor(false)}
        onCreated={(color) => set('colorId', color.id)}
      />
    </>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="card__body">{children}</div>
    </section>
  )
}

