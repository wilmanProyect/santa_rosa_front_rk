import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ANIMAL_ERROR_CODES,
  ANIMALS_ROUTES,
  AnimalPicker,
  SEX_LABELS,
  SPECIES_LABELS,
  WEIGHT_LIMITS,
  animalLabel,
  geneticCategoryShort,
  useAnimal,
  useBreeds,
  useColors,
  type DuplicateIdentifierBody,
  type ParentRef,
  type Sex,
  type Species,
} from '@/features/animals'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatDate, formatKg, optional, todayIso } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { AnimalRefLink, LitterBadge } from '../components/ReproductionBadges'
import { useBreedingService, useRegisterBirth } from '../hooks/useReproduction'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  BIRTH_ASSISTANCE_LABELS,
  LITTER_TYPE_BY_SIZE,
  LITTER_TYPE_LABELS,
  MAX_LITTER_SIZE,
  REPRODUCTION_ERROR_CODES,
  type Birth,
  type BirthAssistance,
  type BirthOffspringInput,
  type BreedingAnimalRef,
  type BreedingService,
} from '../types/reproduction.types'
import './reproduction.css'

interface OffspringRow {
  key: number
  bornAlive: boolean
  sex: Sex | ''
  earTag: string
  birthWeightKg: string
  name: string
  breedId: string
  colorId: string
  notes: string
  expanded: boolean
}

let rowKey = 0
const newRow = (): OffspringRow => ({
  key: ++rowKey,
  bornAlive: true,
  sex: '',
  earTag: '',
  birthWeightKg: '',
  name: '',
  breedId: '',
  colorId: '',
  notes: '',
  expanded: false,
})

interface Parent {
  ref: ParentRef
  species: Species
}

/** Registrar un parto: de una monta (`?monta=`) o sin monta registrada (`?hembra=` opcional). */
export function BirthFormPage() {
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('monta') ?? undefined
  const presetDamId = searchParams.get('hembra') ?? undefined
  const service = useBreedingService(serviceId)
  const presetDam = useAnimal(serviceId ? undefined : presetDamId)

  if (serviceId && service.isError) return <Alert tone="error">{getErrorMessage(service.error)}</Alert>
  if ((serviceId && service.isPending) || (presetDamId && !serviceId && presetDam.isPending)) return <Spinner />

  const initialDam: Parent | null =
    presetDam.data && presetDam.data.sex === 'FEMALE' && !presetDam.data.isExternal
      ? {
          ref: { id: presetDam.data.id, earTag: presetDam.data.earTag, name: presetDam.data.name, isExternal: false },
          species: presetDam.data.species,
        }
      : null

  // La key reinicia el formulario al pasar de "sin monta" a "en la monta abierta".
  return <BirthForm key={serviceId ?? 'sin-monta'} service={service.data ?? null} initialDam={initialDam} />
}

const toParentRef = (a: BreedingAnimalRef): ParentRef => ({
  id: a.id,
  earTag: a.earTag,
  name: a.name,
  isExternal: a.isExternal,
})

function BirthForm({ service, initialDam }: { service: BreedingService | null; initialDam: Parent | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const register = useRegisterBirth()

  const [dam, setDam] = useState<Parent | null>(
    service ? { ref: toParentRef(service.dam), species: service.species } : initialDam,
  )
  const [sire, setSire] = useState<ParentRef | null>(service ? toParentRef(service.sire) : null)
  const [birthDate, setBirthDate] = useState(todayIso())
  const [assistance, setAssistance] = useState<BirthAssistance | ''>('NORMAL')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<OffspringRow[]>(() =>
    Array.from({ length: service?.expectedFetusCount ?? 1 }, newRow),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [invalidKeys, setInvalidKeys] = useState<number[]>([])
  const [result, setResult] = useState<Birth | null>(null)

  const species = dam?.species
  const { data: breeds } = useBreeds({ species, isActive: true }, { enabled: !!species })
  const { data: colors } = useColors({ isActive: true })

  if (result) return <BirthResult birth={result} />

  const litterType = LITTER_TYPE_BY_SIZE[rows.length]
  const saveError = register.error instanceof ApiError ? register.error : null
  const duplicate =
    saveError?.code === ANIMAL_ERROR_CODES.DUPLICATE_IDENTIFIER
      ? (saveError.body as unknown as DuplicateIdentifierBody)
      : null
  const duplicateTags = new Set(
    (duplicate?.conflicts ?? []).map((c) => c.earTag?.trim().toUpperCase()).filter(Boolean),
  )
  const openServiceId =
    saveError?.code === REPRODUCTION_ERROR_CODES.OPEN_SERVICE ? (saveError.body.serviceId as string) : null
  const otherBirthId = typeof saveError?.body.birthId === 'string' ? saveError.body.birthId : null

  function updateRow(key: number, patch: Partial<OffspringRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setInvalidKeys((current) => current.filter((k) => k !== key))
  }

  function validate(): string | null {
    if (!dam) return 'Elija la madre.'
    if (!birthDate) return 'Indique la fecha del parto.'
    if (service && birthDate < service.serviceDate) return 'El parto no puede ser anterior a la monta.'
    const bad = rows.filter((r) => r.bornAlive && (!r.sex || !r.earTag.trim()))
    if (bad.length > 0) {
      setInvalidKeys(bad.map((r) => r.key))
      return 'Cada cría viva necesita sexo y arete.'
    }
    const tags = rows.filter((r) => r.bornAlive).map((r) => r.earTag.trim().toUpperCase())
    const repeated = tags.filter((t, i) => tags.indexOf(t) !== i)
    if (repeated.length > 0) {
      setInvalidKeys(rows.filter((r) => repeated.includes(r.earTag.trim().toUpperCase())).map((r) => r.key))
      return 'Hay crías con el mismo arete en el parto.'
    }
    const weights = rows.map((r) => r.birthWeightKg).filter(Boolean).map(Number)
    if (weights.some((w) => Number.isNaN(w) || w < WEIGHT_LIMITS.min || w > WEIGHT_LIMITS.max)) {
      return 'Revise los pesos al nacer.'
    }
    return null
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setInvalidKeys([])
    const problem = validate()
    if (problem) {
      setFormError(problem)
      return
    }
    const offspring: BirthOffspringInput[] = rows.map((r) =>
      r.bornAlive
        ? {
            bornAlive: true,
            sex: r.sex as Sex,
            earTag: r.earTag.trim(),
            birthWeightKg: r.birthWeightKg ? Number(r.birthWeightKg) : undefined,
            name: optional(r.name),
            breedId: r.breedId || undefined,
            colorId: r.colorId || undefined,
            notes: optional(r.notes),
          }
        : {
            bornAlive: false,
            sex: r.sex || undefined,
            birthWeightKg: r.birthWeightKg ? Number(r.birthWeightKg) : undefined,
          },
    )
    const common = { birthDate, assistance: assistance || undefined, notes: optional(notes), offspring }
    const onSuccess = (birth: Birth) => {
      toast.show(`Parto registrado: ${LITTER_TYPE_LABELS[birth.litterType].toLowerCase()}, ${birth.bornAlive} cría(s) viva(s)`)
      setResult(birth)
      window.scrollTo({ top: 0 })
    }
    if (service) {
      register.mutate({ serviceId: service.id, body: common }, { onSuccess })
    } else {
      register.mutate({ body: { ...common, damId: dam!.ref.id, sireId: sire?.id } }, { onSuccess })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={
          service ? (
            <Link to={REPRODUCTION_ROUTES.serviceDetail(service.id)}>
              <Icon name="arrowLeft" size={14} /> Monta del {formatDate(service.serviceDate)}
            </Link>
          ) : (
            <Link to={REPRODUCTION_ROUTES.births}>
              <Icon name="arrowLeft" size={14} /> Partos
            </Link>
          )
        }
        title={service ? 'Registrar parto de la monta' : 'Registrar parto sin monta'}
        description="Las crías vivas se crean como animales de la cabaña, con la madre y el padre del parto. Las nacidas muertas solo cuentan para los indicadores."
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <section className="card">
          <header className="card__header">
            <h2>Parto</h2>
          </header>
          <div className="card__body stack">
            {service ? (
              <dl className="data-list">
                <div>
                  <dt>Madre</dt>
                  <dd>
                    <AnimalRefLink animal={service.dam} showCategory />
                  </dd>
                </div>
                <div>
                  <dt>Padre</dt>
                  <dd>
                    <AnimalRefLink animal={service.sire} showCategory />
                  </dd>
                </div>
                <div>
                  <dt>Parto probable</dt>
                  <dd>{formatDate(service.expectedBirthDate)}</dd>
                </div>
              </dl>
            ) : (
              <div className="grid-2">
                <AnimalPicker
                  label="Madre *"
                  species=""
                  anySpecies
                  sex="FEMALE"
                  status="ALIVE"
                  placeholder="Buscar hembra por arete o nombre"
                  value={dam?.ref ?? null}
                  onChange={(ref, summary) => {
                    setDam(ref && summary ? { ref, species: summary.species } : null)
                    setSire(null)
                  }}
                />
                <AnimalPicker
                  label="Padre (si se conoce)"
                  species={dam?.species ?? ''}
                  sex="MALE"
                  includeExternal
                  hint={dam ? SPECIES_LABELS[dam.species] : 'Elija primero la madre.'}
                  disabled={!dam}
                  value={sire}
                  onChange={(ref) => setSire(ref)}
                />
              </div>
            )}

            <div className="grid-2">
              <TextField
                label="Fecha del parto"
                type="date"
                required
                min={service?.serviceDate}
                max={todayIso()}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <SelectField
                label="Tipo de parto"
                value={assistance}
                onChange={(e) => setAssistance(e.target.value as BirthAssistance | '')}
              >
                <option value="">Sin indicar</option>
                {(Object.keys(BIRTH_ASSISTANCE_LABELS) as BirthAssistance[]).map((a) => (
                  <option key={a} value={a}>
                    {BIRTH_ASSISTANCE_LABELS[a]}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextAreaField label="Observaciones" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <h2>
                Crías <LitterBadge type={litterType} size={rows.length} />
              </h2>
              <p>
                En orden de nacimiento, de 1 a {MAX_LITTER_SIZE}.
                {service?.expectedFetusCount && ` La ecografía contó ${service.expectedFetusCount}.`}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon="plus"
              disabled={rows.length >= MAX_LITTER_SIZE}
              onClick={() => setRows((current) => [...current, newRow()])}
            >
              Agregar cría
            </Button>
          </header>
          <div className="card__body stack">
            {service?.expectedOffspringCategory && (
              <Alert tone="info">
                Las crías vivas se registrarán como{' '}
                <strong>{geneticCategoryShort(service.expectedOffspringCategory)} (esperada)</strong>, hasta que
                ABSID la confirme.
              </Alert>
            )}
            {rows.map((row, index) => {
              const invalid = invalidKeys.includes(row.key)
              const isDuplicate = row.bornAlive && duplicateTags.has(row.earTag.trim().toUpperCase())
              return (
                <fieldset
                  key={row.key}
                  className={['offspring-row', invalid || isDuplicate ? 'is-invalid' : ''].join(' ')}
                >
                  <legend>
                    Cría {index + 1}
                    {!row.bornAlive && <Badge tone="neutral">Nacida muerta</Badge>}
                  </legend>
                  <div className="offspring-row__grid">
                    <SelectField
                      label="¿Nació viva?"
                      value={row.bornAlive ? 'si' : 'no'}
                      onChange={(e) => updateRow(row.key, { bornAlive: e.target.value === 'si' })}
                    >
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </SelectField>
                    <SelectField
                      label="Sexo"
                      required={row.bornAlive}
                      className={invalid && row.bornAlive && !row.sex ? 'field--invalid' : undefined}
                      value={row.sex}
                      onChange={(e) => updateRow(row.key, { sex: e.target.value as Sex | '' })}
                    >
                      <option value="">{row.bornAlive ? 'Elija…' : 'Sin indicar'}</option>
                      {(Object.keys(SEX_LABELS) as Sex[]).map((s) => (
                        <option key={s} value={s}>
                          {SEX_LABELS[s]}
                        </option>
                      ))}
                    </SelectField>
                    {row.bornAlive && (
                      <TextField
                        label="Arete"
                        required
                        maxLength={50}
                        className={(invalid && !row.earTag.trim()) || isDuplicate ? 'field--invalid' : undefined}
                        hint={isDuplicate ? 'Este arete ya lo tiene otro animal.' : undefined}
                        value={row.earTag}
                        onChange={(e) => updateRow(row.key, { earTag: e.target.value })}
                      />
                    )}
                    <TextField
                      label="Peso al nacer (kg)"
                      type="number"
                      inputMode="decimal"
                      min={WEIGHT_LIMITS.min}
                      max={WEIGHT_LIMITS.max}
                      step="0.01"
                      hint={row.bornAlive ? 'Se registra como pesaje de nacimiento.' : undefined}
                      value={row.birthWeightKg}
                      onChange={(e) => updateRow(row.key, { birthWeightKg: e.target.value })}
                    />
                  </div>
                  {row.bornAlive && row.expanded && (
                    <div className="offspring-row__grid">
                      <TextField
                        label="Nombre"
                        maxLength={100}
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      />
                      <SelectField
                        label="Raza"
                        value={row.breedId}
                        onChange={(e) => updateRow(row.key, { breedId: e.target.value })}
                      >
                        <option value="">La de la madre</option>
                        {breeds?.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="Color"
                        value={row.colorId}
                        onChange={(e) => updateRow(row.key, { colorId: e.target.value })}
                      >
                        <option value="">Sin indicar</option>
                        {colors?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </SelectField>
                      <TextField
                        label="Observaciones"
                        maxLength={1000}
                        value={row.notes}
                        onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    {row.bornAlive ? (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => updateRow(row.key, { expanded: !row.expanded })}
                      >
                        {row.expanded ? 'Menos datos' : 'Nombre, raza, color y observaciones'}
                      </button>
                    ) : (
                      <span />
                    )}
                    {rows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </section>

        {formError && <Alert tone="error">{formError}</Alert>}
        {duplicate && (
          <Alert tone="error">
            {duplicate.message} Corrija el arete marcado en rojo.
          </Alert>
        )}
        {openServiceId && (
          <Alert tone="warning">
            <div className="stack stack--sm">
              <span>{saveError?.message}</span>
              <div>
                <Button
                  size="sm"
                  onClick={() => navigate(REPRODUCTION_ROUTES.newBirthForService(openServiceId), { replace: true })}
                >
                  Registrar el parto en la monta abierta
                </Button>
              </div>
            </div>
          </Alert>
        )}
        {register.isError && !duplicate && !openServiceId && (
          <Alert tone="error">
            {getErrorMessage(register.error)}
            {otherBirthId && (
              <>
                {' '}
                <Link to={REPRODUCTION_ROUTES.birthDetail(otherBirthId)}>Ver ese parto</Link>
              </>
            )}
          </Alert>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={register.isPending}>
            Cancelar
          </Button>
          <Button type="submit" icon="check" loading={register.isPending}>
            Registrar parto
          </Button>
        </div>
      </form>
    </>
  )
}

/** Resumen tras registrar: crías creadas (con enlace a su ficha) y avisos. */
function BirthResult({ birth }: { birth: Birth }) {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        eyebrow="Reproducción"
        title="Parto registrado"
        description={`${animalLabel(birth.dam)} · ${formatDate(birth.birthDate)}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(REPRODUCTION_ROUTES.birthDetail(birth.id))}>
            Ver el parto
          </Button>
        }
      />
      <div className="stack">
        {(birth.warnings ?? []).map((w) => (
          <Alert key={w} tone="warning">
            {w}
          </Alert>
        ))}
        <section className="card">
          <header className="card__header">
            <div>
              <h2>
                Crías <LitterBadge type={birth.litterType} size={birth.litterSize} />
              </h2>
              <p>
                {birth.bornAlive} viva(s){birth.bornDead > 0 && ` · ${birth.bornDead} nacida(s) muerta(s)`}
              </p>
            </div>
          </header>
          <div className="card__body">
            <ul className="offspring-result">
              {birth.offspring.map((o) => (
                <li key={o.position}>
                  <span className="muted small">#{o.position}</span>
                  {o.animal ? (
                    <Link to={ANIMALS_ROUTES.detail(o.animal.id)} className="table__primary">
                      {animalLabel(o.animal)}
                    </Link>
                  ) : (
                    <span className="muted">Nacida muerta</span>
                  )}
                  {o.sex && <span>{SEX_LABELS[o.sex]}</span>}
                  {o.birthWeightKg !== null && <span>{formatKg(o.birthWeightKg)}</span>}
                  {o.animal?.geneticCategory && (
                    <span className="muted">
                      {geneticCategoryShort(o.animal.geneticCategory)}
                      {o.animal.geneticCategoryConfirmed === false && ' · esperada'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  )
}
