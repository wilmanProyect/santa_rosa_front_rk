import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { animalLabel, geneticCategoryShort } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate, formatDateTime, todayIso } from '@/shared/lib/format'
import { Alert, Button, ConfirmDialog, DataItem, Icon, PageHeader, Spinner, useToast } from '@/shared/ui'
import { ReviewBanner } from '@/features/reviews'
import { AnimalRefLink, KinshipOverrideBadge, ServiceStatusBadge } from '../components/ReproductionBadges'
import { AbortionDialog, EditServiceDialog, PregnancyCheckDialog } from '../components/ServiceDialogs'
import {
  useBirths,
  useBreedingService,
  useCancelAbortion,
  useDeleteBreedingService,
  useRemovePregnancyCheck,
} from '../hooks/useReproduction'
import { daysBetween, formatInbreeding } from '../lib/reproduction-format'
import { REPRODUCTION_ROUTES } from '../routes'
import {
  PREGNANCY_CHECK_METHOD_LABELS,
  PREGNANCY_CHECK_RESULT_LABELS,
  SERVICE_TYPE_LABELS,
  type BreedingService,
  type PregnancyCheck,
} from '../types/reproduction.types'
import './reproduction.css'

type DialogId = 'check' | 'abortion' | 'edit' | 'delete' | 'cancel-abortion' | null

function BackLink() {
  return (
    <Link to={REPRODUCTION_ROUTES.services}>
      <Icon name="arrowLeft" size={14} /> Montas
    </Link>
  )
}

export function BreedingServiceDetailPage() {
  const { serviceId } = useParams()
  const { data, isPending, isError, error } = useBreedingService(serviceId)

  if (isError) {
    return (
      <>
        <BackLink />
        <Alert tone="error">{getErrorMessage(error)}</Alert>
      </>
    )
  }
  if (isPending) return <Spinner />
  return <ServiceView service={data} />
}

function ServiceView({ service }: { service: BreedingService }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [dialog, setDialog] = useState<DialogId>(null)
  const [removingCheck, setRemovingCheck] = useState<PregnancyCheck | null>(null)
  const remove = useDeleteBreedingService()
  const cancelAbortion = useCancelAbortion()
  const removeCheck = useRemovePregnancyCheck()

  const canWrite = can(PERMISSIONS.REPRODUCTION_WRITE)
  const canRegisterBirth = can(PERMISSIONS.REPRODUCTION_WRITE, PERMISSIONS.ANIMALS_CREATE)
  const { status } = service
  const inProgress = status === 'PENDING' || status === 'PREGNANT' || status === 'EMPTY'
  const today = todayIso()
  const daysSince = daysBetween(service.serviceDate, today)
  const birthOverdue = (status === 'PENDING' || status === 'PREGNANT') && service.expectedBirthDate < today

  // El parto de la monta: se busca entre los partos de la hembra desde la fecha de la monta.
  const births = useBirths(
    { damId: service.dam.id, from: service.serviceDate, limit: 20 },
    { enabled: status === 'BIRTHED' },
  )
  const birth = births.data?.items.find((b) => b.serviceId === service.id)

  const checks = [...service.checks].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))

  return (
    <>
      <PageHeader
        eyebrow={<BackLink />}
        title={
          <span>
            {animalLabel(service.dam)} × {animalLabel(service.sire)}
            <span className="row" style={{ marginTop: 8, gap: 6 }}>
              <ServiceStatusBadge status={status} />
              {service.kinshipOverride && <KinshipOverrideBadge />}
              <span className="muted small" style={{ fontWeight: 600 }}>
                {SERVICE_TYPE_LABELS[service.type]} · {formatDate(service.serviceDate)}
              </span>
            </span>
          </span>
        }
        actions={
          canWrite && (
            <>
              {inProgress && (
                <Button variant="secondary" icon="activity" onClick={() => setDialog('check')}>
                  Registrar diagnóstico
                </Button>
              )}
              {inProgress && canRegisterBirth && (
                <Button icon="plus" onClick={() => navigate(REPRODUCTION_ROUTES.newBirthForService(service.id))}>
                  Registrar parto
                </Button>
              )}
              {(status === 'PENDING' || status === 'PREGNANT') && (
                <Button variant="secondary" icon="alert" onClick={() => setDialog('abortion')}>
                  Registrar aborto
                </Button>
              )}
              {status === 'ABORTED' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    cancelAbortion.reset()
                    setDialog('cancel-abortion')
                  }}
                >
                  Anular aborto
                </Button>
              )}
              <Button variant="secondary" icon="edit" onClick={() => setDialog('edit')}>
                {inProgress ? 'Editar' : 'Editar observaciones'}
              </Button>
              {inProgress && (
                <Button
                  variant="ghost"
                  icon="trash"
                  aria-label="Eliminar monta"
                  title="Eliminar monta"
                  onClick={() => {
                    remove.reset()
                    setDialog('delete')
                  }}
                />
              )}
            </>
          )
        }
      />

      <div className="stack">
        <ReviewBanner entityType="BREEDING_SERVICE" entityId={service.id} />
        {birthOverdue && (
          <Alert tone="warning">
            La fecha probable de parto ({formatDate(service.expectedBirthDate)}) ya pasó y no hay parto registrado.
          </Alert>
        )}
        {status === 'PENDING' && daysSince >= 30 && (
          <Alert tone={daysSince >= 45 ? 'error' : 'info'}>
            Pasaron {daysSince} días desde la monta: ya se puede diagnosticar la preñez.
          </Alert>
        )}
        {status === 'BIRTHED' && (
          <Alert tone="info">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>La hembra parió.</span>
              {birth ? (
                <Link to={REPRODUCTION_ROUTES.birthDetail(birth.id)}>
                  Ver parto del {formatDate(birth.birthDate)} <Icon name="chevronRight" size={14} />
                </Link>
              ) : births.isPending ? (
                <span className="muted small">Buscando el parto…</span>
              ) : null}
            </div>
          </Alert>
        )}
        {service.abortion && (
          <Alert tone="error">
            <strong>Abortó el {formatDate(service.abortion.date)}</strong>
            {service.abortion.cause && <> · {service.abortion.cause}</>}
          </Alert>
        )}

        <section className="card">
          <header className="card__header">
            <h2>Monta</h2>
          </header>
          <div className="card__body">
            <dl className="data-list">
              <DataItem label="Hembra" value={<AnimalRefLink animal={service.dam} showCategory />} />
              <DataItem label="Macho" value={<AnimalRefLink animal={service.sire} showCategory />} />
              <DataItem label="Tipo" value={SERVICE_TYPE_LABELS[service.type]} />
              <DataItem
                label={service.type === 'ARTIFICIAL_INSEMINATION' ? 'Fecha' : 'Fecha de ingreso'}
                value={formatDate(service.serviceDate)}
              />
              {service.type !== 'ARTIFICIAL_INSEMINATION' && (
                <DataItem
                  label="Fecha de salida"
                  value={
                    service.exitDate && (
                      <>
                        {formatDate(service.exitDate)}{' '}
                        <span className="muted small">
                          ({daysBetween(service.serviceDate, service.exitDate) + 1} día(s) juntos)
                        </span>
                      </>
                    )
                  }
                />
              )}
              <DataItem label="Pajuela" value={service.strawCode} />
              <DataItem
                label="Registrada por"
                value={service.registeredBy && (service.registeredBy.fullName || service.registeredBy.username)}
              />
              <DataItem
                label="Parto probable"
                value={
                  <>
                    {formatDate(service.expectedBirthDate)}
                    {(status === 'PENDING' || status === 'PREGNANT') && (
                      <span className="muted small"> · día {daysSince} de gestación</span>
                    )}
                  </>
                }
              />
              <DataItem
                label="Cría esperada"
                value={service.expectedOffspringCategory && geneticCategoryShort(service.expectedOffspringCategory)}
              />
              <DataItem
                label="Fetos (último diagnóstico)"
                value={service.expectedFetusCount !== null && service.expectedFetusCount}
              />
              <DataItem
                label="Consanguinidad de la cría"
                value={formatInbreeding(service.inbreedingCoefficient)}
              />
            </dl>
          </div>
        </section>

        {service.kinshipOverride && (
          <Alert tone="warning">
            <strong>Autorizada pese al parentesco</strong> el {formatDateTime(service.kinshipOverride.authorizedAt)}.
            <div style={{ whiteSpace: 'pre-wrap' }}>Justificación: {service.kinshipOverride.reason}</div>
          </Alert>
        )}

        <section className="card">
          <header className="card__header">
            <div>
              <h2>Diagnósticos de preñez</h2>
              <p>El estado de la monta sigue al diagnóstico más reciente.</p>
            </div>
          </header>
          <div className="card__body">
            {checks.length === 0 ? (
              <div className="empty">
                <Icon name="activity" size={28} />
                Sin diagnósticos. Se puede diagnosticar desde los 30 días de la monta.
              </div>
            ) : (
              <ol className="timeline">
                {checks.map((c) => (
                  <li key={c.id} className={c.result === 'PREGNANT' ? 'is-positive' : 'is-negative'}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>
                        {PREGNANCY_CHECK_RESULT_LABELS[c.result]}
                        {c.fetusCount && ` · ${c.fetusCount} ${c.fetusCount === 1 ? 'feto' : 'fetos'}`}
                      </strong>
                      {canWrite && inProgress && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Eliminar diagnóstico"
                          aria-label={`Eliminar diagnóstico del ${formatDate(c.checkedAt)}`}
                          onClick={() => {
                            removeCheck.reset()
                            setRemovingCheck(c)
                          }}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                    <span className="muted small">
                      {formatDate(c.checkedAt)} · {PREGNANCY_CHECK_METHOD_LABELS[c.method]} · día{' '}
                      {daysBetween(service.serviceDate, c.checkedAt)}
                    </span>
                    {c.notes && <span className="small">{c.notes}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {service.notes && (
          <section className="card">
            <header className="card__header">
              <h2>Observaciones</h2>
            </header>
            <div className="card__body">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>
                {service.notes}
              </p>
            </div>
          </section>
        )}

        <p className="m-0 muted small">
          Registrada el {formatDateTime(service.createdAt)} · última modificación {formatDateTime(service.updatedAt)}
        </p>
      </div>

      <PregnancyCheckDialog open={dialog === 'check'} service={service} onClose={() => setDialog(null)} />
      <AbortionDialog open={dialog === 'abortion'} service={service} onClose={() => setDialog(null)} />
      <EditServiceDialog open={dialog === 'edit'} service={service} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Eliminar monta"
        message="Eliminar es solo para montas cargadas por error: se borran también sus diagnósticos. Para cambiar la pareja o el tipo, elimínela y regístrela de nuevo."
        confirmLabel="Eliminar monta"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          remove.mutate(service.id, {
            onSuccess: () => {
              toast.show('Monta eliminada')
              navigate(REPRODUCTION_ROUTES.services, { replace: true })
            },
          })
        }
      />
      <ConfirmDialog
        open={dialog === 'cancel-abortion'}
        title="Anular aborto"
        message="Use esta opción solo si el aborto se registró por error. La monta vuelve al estado de su último diagnóstico."
        confirmLabel="Anular aborto"
        tone="primary"
        loading={cancelAbortion.isPending}
        error={cancelAbortion.isError ? getErrorMessage(cancelAbortion.error) : null}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          cancelAbortion.mutate(service.id, {
            onSuccess: () => {
              toast.show('Aborto anulado')
              setDialog(null)
            },
          })
        }
      />
      <ConfirmDialog
        open={removingCheck !== null}
        title="Eliminar diagnóstico"
        message={
          removingCheck &&
          `¿Eliminar el diagnóstico del ${formatDate(removingCheck.checkedAt)} (${PREGNANCY_CHECK_RESULT_LABELS[removingCheck.result].toLowerCase()})? El estado de la monta se recalcula.`
        }
        confirmLabel="Eliminar"
        loading={removeCheck.isPending}
        error={removeCheck.isError ? getErrorMessage(removeCheck.error) : null}
        onClose={() => setRemovingCheck(null)}
        onConfirm={() =>
          removingCheck &&
          removeCheck.mutate(
            { serviceId: service.id, checkId: removingCheck.id },
            {
              onSuccess: () => {
                toast.show('Diagnóstico eliminado')
                setRemovingCheck(null)
              },
            },
          )
        }
      />
    </>
  )
}
