import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

// Function to parse and render formatted message text
const renderFormattedMessage = (text) => {
  if (!text) return '';
  
  // Split by double newlines for paragraphs
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((paragraph, pIdx) => (
    <div key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
      {paragraph.split(/(_[^_]+_)/g).map((segment, idx) => {
        // Check if this is an italicized segment
        if (segment.startsWith('_') && segment.endsWith('_')) {
          return (
            <em key={idx} className="italic">
              {segment.slice(1, -1)}
            </em>
          );
        }
        return <span key={idx}>{segment}</span>;
      })}
    </div>
  ));
};

function NotificationMenu({ currentUser }) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllAsRead,
    sendReply: sendNotificationReply,
    respondToNotification,
  } = useNotifications(currentUser);
  const [open, setOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const hasUnread = unreadCount > 0;

  const handleReply = (notif) => {
    setReplyingTo(notif);
  };

  const sendReply = async (notif) => {
    try {
      await sendNotificationReply(notif, replyMessage);
      setReplyMessage('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  };

  useEffect(() => {
    if (!open) return;

    markAllAsRead().catch((err) => {
      console.error('Failed to mark notifications as read', err);
    });
  }, [markAllAsRead, open]);

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setVisibleCount(10); }}>
      <SheetTrigger asChild>
        <button className="relative p-3 rounded-full hover:bg-gray-100 transition">
          <Bell className="w-7 h-7 text-gray-700" />

          {hasUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[350px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            View your ride updates and activity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4">
          {error ? (
            <p className='mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
              {error}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 px-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {isLoading ? (
            <p className='text-sm text-gray-500'>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500">
              No notifications yet.
            </p>
          ) : (
            <>
            {notifications.slice(0, visibleCount).map((notif) => {
              const isLeftListMessage =
                typeof notif.message === 'string' &&
                /(left|removed)\b/i.test(notif.message) &&
                /rid(?:er|ing) list/i.test(notif.message);
              const displayType = (notif.type === 'left_list' || isLeftListMessage)
                ? 'left_list'
                : notif.type;

              const typeStyles = {
                join_list:              { bg: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700',                                                                                     label: 'Joined List' },
                ride_request:           { bg: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-100 text-blue-700',                                                                                         label: 'Ride Request' },
                ride_request_response:  { bg: 'bg-gray-50 border-gray-200',     badge: notif.message?.includes('accepted') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',                    label: notif.message?.includes('accepted') ? 'Accepted' : 'Declined' },
                friend_request:         { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700',                                                                                     label: 'Friend Request' },
                friend_request_response:{ bg: 'bg-gray-50 border-gray-200',     badge: notif.message?.includes('accepted') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',                    label: notif.message?.includes('accepted') ? 'Accepted' : 'Declined' },
                left_list:              { bg: 'bg-red-50 border-red-200',       badge: 'bg-red-100 text-red-700',                                                                                           label: 'Left List' },
                message:                { bg: 'bg-gray-50 border-gray-200',     badge: 'bg-gray-100 text-gray-600',                                                                                         label: 'Message' },
              };
              const style = typeStyles[displayType] || typeStyles.message;
              const actionableTypes = ['ride_request', 'join_list', 'friend_request'];
              const isActionable = actionableTypes.includes(notif.type) && !notif.response;
              const hasResponded = actionableTypes.includes(notif.type) && notif.response;
              const canReply = !actionableTypes.includes(notif.type) && notif.type !== 'friend_request_response';

              return (
                <div
                  key={notif._id}
                  className={`p-3 rounded-lg border ${style.bg}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {notif.senderName || "Someone"}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  {notif.replyToMessage && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      Replying to: <div className="inline">{renderFormattedMessage(notif.replyToMessage)}</div>
                    </div>
                  )}
                  <div className="text-sm text-gray-700">
                    {renderFormattedMessage(notif.message)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>

                  {/* Accept/Decline for ride_request and join_list */}
                  {isActionable && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => respondToNotification(notif, 'accepted')}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToNotification(notif, 'declined')}
                        className="text-sm bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Response status */}
                  {hasResponded && (
                    <p className={`mt-2 text-xs font-medium ${notif.response === 'accepted' ? 'text-green-600' : 'text-red-500'}`}>
                      You {notif.response} this request.
                      {notif.type === 'join_list' && notif.response === 'declined' && ' (Removed from list)'}
                      {notif.type === 'ride_request' && notif.response === 'declined' && ' (Driver removed)'}
                    </p>
                  )}

                  {/* Reply for message / invitation / ride_request_response */}
                  {canReply && (
                    <>
                      <button
                        onClick={() => handleReply(notif)}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        Reply
                      </button>
                      {replyingTo?._id === notif._id && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="w-full border rounded-md p-2 text-sm"
                            placeholder="Write a reply..."
                          />
                          <button
                            onClick={() => sendReply(notif)}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md"
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className='flex justify-center gap-4 py-2'>
              {visibleCount < notifications.length && (
                <button
                  onClick={() => setVisibleCount(c => c + 10)}
                  className='text-sm text-blue-600 hover:underline'
                >
                  See more ({notifications.length - visibleCount} remaining)
                </button>
              )}
              {visibleCount > 10 && (
                <button
                  onClick={() => setVisibleCount(c => Math.max(10, c - 10))}
                  className='text-sm text-gray-500 hover:underline'
                >
                  See less
                </button>
              )}
            </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationMenu;