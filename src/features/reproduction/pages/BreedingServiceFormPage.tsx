import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  AnimalPicker,
  SPECIES_LABELS,
  animalLabel,
  useAnimal,
  type ParentRef,
  type Species,
} from '@/features/animals'
import { useAuth } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { optional, todayIso } from '@/shared/lib/format'
import {
  Alert,
  Button,
  Icon,
  PageHeader,
  Spinner,
  TextAreaField,
  TextField,
  useToast,
} from '@/shared/ui'
import { BreedingCheckPanel } from '../components/BreedingCheckPanel'
import { KinshipDetails } from '../components/KinshipDetails'
import { OverrideKinshipDialog } from '../components/OverrideKinshipDialog'
import { useBreedingCheck, useCreateBreedingService } from '../hooks/useReproduction'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  REPRODUCTION_ERROR_CODES,
  SERVICE_TYPE_LABELS,
  type BreedingCheckRequest,
  type BreedingService,
  type KinshipConflictBody,
  type ServiceType,
} from '../types/reproduction.types'
import './reproduction.css'

interface Dam {
  ref: ParentRef
  species: Species
}

/** Registrar una monta, con la revisión en vivo de la pareja (POST /breeding/check). */
export function BreedingServiceFormPage() {
  const [searchParams] = useSearchParams()
  const presetDamId = searchParams.get('hembra') ?? undefined
  const preset = useAnimal(presetDamId)

  if (presetDamId && preset.isPending) return <Spinner />

  const initialDam: Dam | null =
    preset.data && preset.data.sex === 'FEMALE' && !preset.data.isExternal
      ? {
          ref: { id: preset.data.id, earTag: preset.data.earTag, name: preset.data.name, isExternal: false },
          species: preset.data.species,
        }
      : null

  return <BreedingServiceForm initialDam={initialDam} />
}

function BreedingServiceForm({ initialDam }: { initialDam: Dam | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const create = useCreateBreedingService()

  const [dam, setDam] = useState<Dam | null>(initialDam)
  const [sire, setSire] = useState<ParentRef | null>(null)
  const [type, setType] = useState<ServiceType>('DIRECTED')
  const [serviceDate, setServiceDate] = useState(todayIso())
  const [strawCode, setStrawCode] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [overrideOpen, setOverrideOpen] = useState(false)

  const isInsemination = type === 'ARTIFICIAL_INSEMINATION'
  const canOverride = can(PERMISSIONS.REPRODUCTION_OVERRIDE_KINSHIP)

  const checkRequest: BreedingCheckRequest | null =
    dam && sire && serviceDate ? { damId: dam.ref.id, sireId: sire.id, type, serviceDate } : null
  // Debounce de 300 ms: sobre todo al escribir la fecha.
  const debouncedRequest = useDebouncedValue(checkRequest, 300)
  const sameRequest = JSON.stringify(debouncedRequest) === JSON.stringify(checkRequest)
  const check = useBreedingCheck(checkRequest && sameRequest ? debouncedRequest : null)
  const evaluation = checkRequest && check.data ? check.data : undefined
  const checking = !!checkRequest && (!sameRequest || check.isFetching)

  const blocks = evaluation?.blocks ?? []
  const hardBlocks = blocks.filter((b) => !b.overridable)
  const kinshipBlock = blocks.find((b) => b.code === REPRODUCTION_ERROR_CODES.KINSHIP_CONFLICT)

  // Errores del guardado: los datos pueden cambiar entre la revisión y el guardado.
  const saveError = create.error instanceof ApiError ? create.error : null
  const openServiceId =
    saveError?.code === REPRODUCTION_ERROR_CODES.OPEN_SERVICE ? (saveError.body.serviceId as string) : null
  const kinshipConflict =
    saveError?.code === REPRODUCTION_ERROR_CODES.KINSHIP_CONFLICT ? (saveError.body as unknown as KinshipConflictBody) : null
  const needsOverride = !!kinshipBlock || !!kinshipConflict

  function changeType(next: ServiceType) {
    setType(next)
    // En la inseminación el padre siempre es un reproductor externo.
    if (next === 'ARTIFICIAL_INSEMINATION' && sire && !sire.isExternal) setSire(null)
    if (next === 'DIRECTED') setStrawCode('')
  }

  function submit(override?: string) {
    setFormError(null)
    if (!dam || !sire) {
      setFormError('Elija la hembra y el macho.')
      return
    }
    create.mutate(
      {
        damId: dam.ref.id,
        sireId: sire.id,
        type,
        serviceDate,
        strawCode: isInsemination ? optional(strawCode) : undefined,
        performedBy: optional(performedBy),
        notes: optional(notes),
        ...(override ? { overrideKinship: true, overrideReason: override } : {}),
      },
      { onSuccess: handleSaved },
    )
  }

  function handleSaved(service: BreedingService) {
    setOverrideOpen(false)
    toast.show(`Monta registrada: ${animalLabel(service.dam)} × ${animalLabel(service.sire)}`)
    for (const warning of service.warnings ?? []) toast.show(warning, 'info')
    navigate(REPRODUCTION_ROUTES.serviceDetail(service.id), { replace: true })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (needsOverride) {
      if (canOverride) setOverrideOpen(true)
      return
    }
    submit()
  }

  const saveDisabled = !dam || !sire || checking || hardBlocks.length > 0 || (needsOverride && !canOverride)

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to={REPRODUCTION_ROUTES.services}>
            <Icon name="arrowLeft" size={14} /> Montas
          </Link>
        }
        title="Registrar monta"
        description="Elija la hembra y el macho: el sistema revisa el parentesco, la monta abierta y la categoría de la cría."
      />

      <form className="breeding-form" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card__body stack">
            {formError && <Alert tone="error">{formError}</Alert>}

            <div className="segmented-choice" role="radiogroup" aria-label="Tipo de monta">
              {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((t) => (
                <label key={t} className="choice">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => changeType(t)}
                  />
                  <span>
                    <strong>{SERVICE_TYPE_LABELS[t]}</strong>
                    <small className="muted">
                      {t === 'DIRECTED' ? 'Macho propio o externo' : 'Reproductor externo y pajuela'}
                    </small>
                  </span>
                </label>
              ))}
            </div>

            <div className="grid-2">
              <AnimalPicker
                label="Hembra *"
                species=""
                anySpecies
                sex="FEMALE"
                status="ALIVE"
                placeholder="Buscar hembra por arete o nombre"
                hint="Hembras vivas de la cabaña."
                value={dam?.ref ?? null}
                onChange={(ref, summary) => {
                  setDam(ref && summary ? { ref, species: summary.species } : null)
                  if (!ref || (summary && dam && summary.species !== dam.species)) setSire(null)
                }}
              />
              <AnimalPicker
                label="Macho *"
                species={dam?.species ?? ''}
                sex="MALE"
                includeExternal
                onlyExternal={isInsemination}
                placeholder={isInsemination ? 'Buscar reproductor externo' : 'Buscar macho propio o externo'}
                hint={
                  dam
                    ? `${SPECIES_LABELS[dam.species]}${isInsemination ? ' · solo reproductores externos' : ''}.`
                    : 'Elija primero la hembra.'
                }
                disabled={!dam}
                value={sire}
                onChange={(ref) => setSire(ref)}
              />
            </div>

            <div className="grid-2">
              <TextField
                label="Fecha de la monta"
                type="date"
                required
                max={todayIso()}
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
              {isInsemination ? (
                <TextField
                  label="Código de la pajuela"
                  maxLength={50}
                  value={strawCode}
                  onChange={(e) => setStrawCode(e.target.value)}
                />
              ) : (
                <div />
              )}
            </div>
            <TextField
              label="Quién hizo la monta"
              maxLength={150}
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
            />
            <TextAreaField label="Observaciones" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        <aside className="stack">
          {checkRequest ? (
            <BreedingCheckPanel evaluation={evaluation} loading={checking} error={check.error} />
          ) : (
            <div className="check-panel check-panel--empty">
              <Icon name="heart" size={24} />
              <span>Elija la hembra y el macho para revisar la pareja.</span>
            </div>
          )}

          {openServiceId && (
            <Alert tone="error">
              {saveError?.message}{' '}
              <Link to={REPRODUCTION_ROUTES.serviceDetail(openServiceId)}>Ver la monta abierta</Link>
            </Alert>
          )}
          {kinshipConflict && (
            <Alert tone="error">
              <strong>{kinshipConflict.message}</strong>
              <KinshipDetails kinship={kinshipConflict.kinship} />
            </Alert>
          )}
          {saveError && saveError.status === 403 && (
            <Alert tone="error">Falta el permiso para autorizar una monta entre parientes.</Alert>
          )}
          {create.isError && !openServiceId && !kinshipConflict && saveError?.status !== 403 && (
            <Alert tone="error">{getErrorMessage(create.error)}</Alert>
          )}

          {needsOverride && !canOverride && (
            <Alert tone="info">Solo un administrador puede autorizar esta monta.</Alert>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => navigate(REPRODUCTION_ROUTES.services)}>
              Cancelar
            </Button>
            {needsOverride && canOverride ? (
              <Button type="submit" variant="danger" icon="alert" disabled={!dam || !sire || checking || hardBlocks.length > 0}>
                Autorizar de todos modos
              </Button>
            ) : (
              <Button type="submit" icon="check" loading={create.isPending} disabled={saveDisabled}>
                Registrar monta
              </Button>
            )}
          </div>
        </aside>
      </form>

      <OverrideKinshipDialog
        open={overrideOpen}
        kinship={kinshipConflict?.kinship ?? evaluation?.kinship ?? null}
        loading={create.isPending}
        error={overrideOpen && create.isError && !kinshipConflict ? getErrorMessage(create.error) : null}
        onClose={() => setOverrideOpen(false)}
        onConfirm={(reason) => submit(reason)}
      />
    </>
  )
}
