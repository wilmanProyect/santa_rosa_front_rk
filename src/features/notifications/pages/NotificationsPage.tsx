import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Button, Icon, PageHeader, Pagination, Spinner } from '@/shared/ui'
import { NotificationItem } from '../components/NotificationItem'
import { useMarkAllNotificationsRead, useNotifications, useUnreadCount } from '../hooks/useNotifications'
import { useOpenNotification } from '../hooks/useOpenNotification'
import './notifications.css'

const PAGE_SIZE = 20

/** Todas las notificaciones del usuario, paginadas. */
export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error, isFetching } = useNotifications({
    unreadOnly: unreadOnly || undefined,
    page,
    limit: PAGE_SIZE,
  })
  const unread = useUnreadCount()
  const markAll = useMarkAllNotificationsRead()
  const open = useOpenNotification()
  const unreadCount = unread.data?.count ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Avisos"
        title="Notificaciones"
        description="Partos próximos, destetes, controles de peso y sanitarios."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" icon="check" loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Marcar todas como leídas
            </Button>
          )
        }
      />

      <div className="toolbar">
        <label className="toolbar__check">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked)
              setPage(1)
            }}
          />
          Solo no leídas
        </label>
      </div>

      {markAll.isError && <Alert tone="error">{getErrorMessage(markAll.error)}</Alert>}
      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <>
          {data.items.length === 0 ? (
            <div className="card empty">
              <Icon name="bell" size={28} />
              {unreadOnly ? 'No tiene notificaciones sin leer.' : 'No tiene notificaciones.'}
            </div>
          ) : (
            <section className="card" aria-busy={isFetching}>
              <ul className="notification-list notification-list--page">
                {data.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={open} />
                ))}
              </ul>
            </section>
          )}
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="notificación(es)" onChange={setPage} />
        </>
      )}
    </>
  )
}
