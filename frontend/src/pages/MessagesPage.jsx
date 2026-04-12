import { MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const messageTypes = new Set(['message', 'ride_request_response']);

const MessagesPage = ({ currentUser }) => {
  const {
    notifications,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refreshNotifications,
  } = useNotifications(currentUser);

  const messageNotifications = notifications.filter((item) =>
    messageTypes.has(item.type)
  );

  const { handlers, progress, isPulling } = usePullToRefresh(
    () => refreshNotifications({ silent: true }),
    { enabled: Boolean(currentUser) }
  );

  return (
    <div className="min-h-screen bg-white pb-20" {...handlers}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="mt-1 text-sm text-gray-500">
              Live updates for replies, approvals, and direct ride messages.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {isPulling
                ? progress >= 1
                  ? 'Release to refresh'
                  : 'Pull down to refresh'
                : lastUpdatedAt
                  ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
                  : 'Waiting for updates'}
            </p>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => refreshNotifications({ silent: true }).catch(() => {})}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600'>
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <p className='text-sm text-gray-500'>Loading messages...</p>
        ) : messageNotifications.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center'>
            <MessageCircle className='mx-auto mb-3 h-8 w-8 text-gray-300' />
            <h2 className='text-lg font-semibold text-gray-800'>No messages yet</h2>
            <p className='mt-2 text-sm text-gray-500'>
              New ride replies and message notifications will appear here automatically.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {messageNotifications.map((message) => (
              <div
                key={message._id}
                className='rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm'
              >
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>
                      {message.senderName || 'Someone'}
                    </p>
                    <p className='text-xs uppercase tracking-wide text-gray-400'>
                      {message.type === 'ride_request_response' ? 'Request Update' : 'Message'}
                    </p>
                  </div>
                  <p className='text-xs text-gray-400'>
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>

                {message.replyToMessage ? (
                  <p className='mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs italic text-gray-500'>
                    Replying to: {message.replyToMessage}
                  </p>
                ) : null}

                <p className='mt-3 text-sm leading-6 text-gray-700'>{message.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;