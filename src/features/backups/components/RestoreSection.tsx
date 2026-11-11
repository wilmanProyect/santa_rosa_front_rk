import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/api-error'
import { formatBytes, formatDateTime } from '@/shared/lib/format'
import { Alert, Button, DataItem, Spinner, TextField } from '@/shared/ui'
import {
  backupsApi,
  RESTORE_CONFIRMATION_WORD,
  type RestoreOutcome,
  type RestorePreview,
} from '../api/backups.api'

const SERVER_FILES_KEY = ['backups', 'server-files'] as const

type Busy = null | 'upload' | 'server' | 'restore' | 'cancel'

/**
 * Restauración en dos pasos: 1) subir un respaldo (o elegir uno del servidor),
 * que la API verifica sin tocar nada; 2) revisar de cuándo es y confirmar
 * escribiendo RESTAURAR. Antes de restaurar, la API guarda un respaldo del
 * estado actual en el servidor.
 */
export function RestoreSection() {
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [outcome, setOutcome] = useState<RestoreOutcome | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Cerrar o recargar la pestaña corta la subida o deja sin ver el resultado de la restauración.
  useEffect(() => {
    if (busy !== 'upload' && busy !== 'restore') return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  async function run<T>(kind: Busy, action: () => Promise<T>): Promise<T | undefined> {
    setBusy(kind)
    setError(null)
    try {
      return await action()
    } catch (err) {
      // La restauración preparada venció (30 minutos), se descartó o ya se usó: volver al paso 1.
      if (kind === 'restore' && err instanceof ApiError && err.status === 404) {
        setPreview(null)
        setError('La restauración preparada venció (hay 30 minutos para confirmar) o se descartó. Vuelva a elegir el respaldo.')
      } else {
        setError(restoreErrorMessage(err))
      }
      return undefined
    } finally {
      setBusy(null)
    }
  }

  if (outcome) return <RestoreDone outcome={outcome} />

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Restaurar una copia de seguridad</h2>
          <p>
            Reemplaza <strong>todos</strong> los datos, fotos y certificados actuales por los del respaldo. Antes
            se guarda automáticamente un respaldo del estado actual en el servidor, para poder volver atrás.
          </p>
        </div>
      </header>
      <div className="card__body stack">
        {error && <Alert tone="error">{error}</Alert>}
        {busy === 'upload' && (
          <Alert tone="info">
            {progress < 1
              ? `Subiendo y verificando... ${Math.round(progress * 100)} %`
              : 'Archivo subido. Verificando el respaldo completo...'}
            <progress
              max={1}
              value={progress}
              aria-label="Avance de la subida"
              style={{ display: 'block', width: '100%', marginTop: 8, accentColor: 'var(--color-primary)' }}
            />
          </Alert>
        )}
        {busy === 'restore' && (
          <Alert tone="warning">
            <strong>Restaurando... no cierre esta pestaña.</strong> Puede tardar varios minutos.
          </Alert>
        )}
        {preview ? (
          <ConfirmRestore
            preview={preview}
            busy={busy}
            onConfirm={async () => {
              const result = await run('restore', () => backupsApi.confirm(preview.restoreId))
              if (result) setOutcome(result)
            }}
            onCancel={async () => {
              await run('cancel', () => backupsApi.cancel(preview.restoreId))
              setPreview(null)
            }}
          />
        ) : (
          <ChooseBackup
            busy={busy}
            onUpload={async (file) => {
              setProgress(0)
              const staged = await run('upload', () => backupsApi.stageUpload(file, setProgress))
              if (staged) setPreview(staged)
            }}
            onServerFile={async (fileName) => {
              const staged = await run('server', () => backupsApi.stageServerFile(fileName))
              if (staged) setPreview(staged)
            }}
          />
        )}
      </div>
    </section>
  )
}

function ChooseBackup({
  busy,
  onUpload,
  onServerFile,
}: {
  busy: Busy
  onUpload(file: File): Promise<void>
  onServerFile(fileName: string): Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const files = useQuery({ queryKey: SERVER_FILES_KEY, queryFn: backupsApi.listServerFiles })

  return (
    <>
      <div className="stack">
        <h3 className="m-0">Desde un archivo</h3>
        <p className="muted small m-0">
          Elija un respaldo descargado de este sistema (<span className="mono">.tar.gz</span>). Se sube y se verifica
          completo; todavía no se modifica nada.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            type="file"
            accept=".tar.gz,.gz,application/gzip"
            disabled={busy !== null}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            icon="upload"
            disabled={!file || busy !== null}
            loading={busy === 'upload'}
            onClick={() => file && void onUpload(file)}
          >
            Verificar respaldo
          </Button>
        </div>
        {file && (
          <p className="muted small m-0">
            {file.name} · {formatBytes(file.size)}
          </p>
        )}
      </div>

      <div className="stack">
        <h3 className="m-0">Desde la carpeta del servidor</h3>
        <p className="muted small m-0">
          Respaldos generados por terminal y los que se guardan antes de cada restauración ("antes-de-restaurar-…").
          Úselos para volver atrás o si el archivo es demasiado grande para subirlo.
        </p>
        {files.isPending && <Spinner />}
        {files.isError && <Alert tone="error">{getErrorMessage(files.error)}</Alert>}
        {files.data && files.data.length === 0 && <p className="muted small m-0">No hay respaldos en el servidor.</p>}
        {files.data && files.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {files.data.map((f) => (
                  <tr key={f.fileName}>
                    <td className="mono small">{f.fileName}</td>
                    <td className="nowrap">{formatBytes(f.size)}</td>
                    <td className="nowrap">{formatDateTime(f.modifiedAt)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null}
                        loading={busy === 'server' && picked === f.fileName}
                        onClick={() => {
                          setPicked(f.fileName)
                          void onServerFile(f.fileName)
                        }}
                      >
                        Preparar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function ConfirmRestore({
  preview,
  busy,
  onConfirm,
  onCancel,
}: {
  preview: RestorePreview
  busy: Busy
  onConfirm(): Promise<void>
  onCancel(): Promise<void>
}) {
  const [word, setWord] = useState('')
  const b = preview.backup
  const ready = word.trim() === RESTORE_CONFIRMATION_WORD

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (ready) void onConfirm()
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Alert tone="info">
        Respaldo verificado: el archivo está completo y no tiene errores. Todavía no se modificó nada.
      </Alert>
      <dl className="data-list">
        <DataItem label="Archivo" value={<span className="mono">{preview.origin.fileName}</span>} />
        <DataItem label="Respaldo del" value={<strong>{formatDateTime(b.createdAt)}</strong>} />
        <DataItem label="Generado por" value={b.createdBy} />
        <DataItem label="Base de datos" value={formatBytes(b.database.size)} />
        <DataItem label="Fotos y certificados" value={`${b.files} archivo(s) · ${formatBytes(b.totalFileBytes)}`} />
      </dl>
      {preview.pendingMigrations.length > 0 && (
        <Alert tone="info">
          El respaldo es de una versión anterior del sistema: después de restaurarlo se aplicarán{' '}
          {preview.pendingMigrations.length} actualización(es) de la base.
        </Alert>
      )}
      <Alert tone="error">
        <strong>Se reemplazarán TODOS los datos, fotos y certificados actuales</strong> por los del respaldo del{' '}
        {formatDateTime(b.createdAt)}. Lo cargado después de esa fecha se perderá (queda solo en el respaldo previo
        que se guarda en el servidor). Al terminar, todos los usuarios deben volver a ingresar.
      </Alert>
      <TextField
        label={`Escriba ${RESTORE_CONFIRMATION_WORD} para confirmar`}
        autoComplete="off"
        value={word}
        disabled={busy !== null}
        onChange={(e) => setWord(e.target.value)}
      />
      <p className="muted small m-0">Tiene hasta las {formatDateTime(preview.expiresAt)} para confirmar.</p>
      <div className="row" style={{ gap: 8 }}>
        <Button type="submit" variant="danger" icon="upload" disabled={!ready || busy !== null} loading={busy === 'restore'}>
          Restaurar
        </Button>
        <Button variant="secondary" disabled={busy !== null} loading={busy === 'cancel'} onClick={() => void onCancel()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function RestoreDone({ outcome }: { outcome: RestoreOutcome }) {
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  return (
    <section className="card">
      <div className="card__body stack">
        <Alert tone="info">
          <strong>Restauración completada.</strong> El sistema tiene los datos del respaldo del{' '}
          {formatDateTime(outcome.restoredFrom)}: base de datos y {outcome.uploadedFiles} archivo(s)
          {outcome.deletedFiles > 0 && ` (se quitaron ${outcome.deletedFiles} que no estaban en el respaldo)`}.
          {outcome.migrationsApplied.length > 0 &&
            ` Se aplicaron ${outcome.migrationsApplied.length} actualización(es) de la base.`}
        </Alert>
        <p className="m-0">
          El estado anterior quedó guardado en el servidor como{' '}
          <span className="mono">{outcome.safetyCopy.fileName}</span> ({formatBytes(outcome.safetyCopy.size)}). Para
          volver atrás, prepárelo desde "Desde la carpeta del servidor".
        </p>
        <p className="m-0">Los usuarios y las sesiones ahora son los del respaldo: vuelva a ingresar.</p>
        <div>
          <Button
            icon="logout"
            onClick={() => {
              queryClient.clear()
              // El token anterior puede no existir en la base restaurada: la sesión se cierra igual.
              logout().catch(() => undefined)
            }}
          >
            Volver a ingresar
          </Button>
        </div>
      </div>
    </section>
  )
}

function restoreErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) {
      return 'El archivo es demasiado grande para subirlo. Cópielo a la carpeta de respaldos del servidor y restáurelo desde allí.'
    }
    if (err.code === 'BACKUP_FROM_NEWER_VERSION') return err.message
    if (err.status === 409) return `${err.message} Vuelva a intentarlo en unos minutos.`
  }
  return getErrorMessage(err)
}
