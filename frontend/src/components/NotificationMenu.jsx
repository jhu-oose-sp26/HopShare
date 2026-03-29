import { useEffect, useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Bell } from "lucide-react";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function NotificationMenu({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Check if any unread notifications exist
  const hasUnread = notifications.some((n) => !n.read);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser?._id) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `${API_ROOT}/notifications/${currentUser._id}`
        );
        const data = await res.json();
        setNotifications(data);
        console.log(data)
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
  }, [currentUser]);

  const handleReply = (notif) => {
    setReplyingTo(notif);
  };

  const sendReply = async (notif) => {
  try {
    await fetch(`${API_ROOT}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: notif.senderId, // send back to original sender
        senderName: currentUser.name,
        senderId: currentUser._id,
        message: replyMessage,
        postId: notif.postId,
        replyToMessage: notif.message,
      }),
    });

    setReplyMessage('');
    setReplyingTo(null);
  } catch (err) {
    console.error("Failed to send reply", err);
  }
};

  // mark all as read when sheet opens
  useEffect(() => {
    if (!open) return;

    const markAllAsRead = async () => {
      try {
        const unread = notifications.filter((n) => !n.read);

        await Promise.all(
          unread.map((n) =>
            fetch(`${API_ROOT}/notifications/${n._id}/read`, {
              method: "PATCH",
            })
          )
        );

        // update local state 
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
      } catch (err) {
        console.error("Failed to mark notifications as read", err);
      }
    };

    if (notifications.length > 0) {
      markAllAsRead();
    }
  }, [open]); // when sheet opens

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-3 rounded-full hover:bg-gray-100 transition">
          <Bell className="w-7 h-7 text-gray-700" />

          {/* Only show dot if unread exists */}
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

        <div className="mt-4 space-y-3 px-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">
              No notifications yet.
            </p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                className="p-3 rounded-lg border bg-gray-50"
              >
                <p className="text-sm font-medium">
                  {notif.senderName || "Someone"}
                </p>
                {notif.replyToMessage && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    Replying to: "{notif.replyToMessage}"
                  </p>
                )}
                <p className="text-sm text-gray-700">
                  {notif.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>

                <button
                onClick={() => handleReply(notif)}
                className="mt-2 text-xs text-blue-600 hover:underline">
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
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationMenu;