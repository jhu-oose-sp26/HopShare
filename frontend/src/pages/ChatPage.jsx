import { Chat } from '@/components/chat/chat';
import { ChatHeader,
  ChatHeaderAddon,
  ChatHeaderButton,
  ChatHeaderMain } from '@/components/chat/chat-header';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatToolbar,
  ChatToolbarAddon,
  ChatToolbarTextarea,
  ChatToolbarButton } from '@/components/chat/chat-toolbar';
import { SquareChevronRightIcon, ArrowLeft, Info } from 'lucide-react';
import { AdditionalMessage } from '@/components/examples/additional-message';
import { PrimaryMessage } from '@/components/examples/primary-message';
import { Fragment, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DateItem } from '@/components/examples/date-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import placeholderAvatar from '@/user-placeholder.png';
import { io } from "socket.io-client";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ROOT;
const PROFILE_CACHE_KEY = 'profileCache';
const PROFILE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const socket = io(SOCKET_URL);

const loadProfileCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveProfileCache = (cache) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
};

const isCacheExpired = (entry) => {
  if (!entry || !entry.fetchedAt) return true;
  return Date.now() - entry.fetchedAt > PROFILE_CACHE_TTL;
};


const ChatPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId, postId, isDm } = location.state || {};
  const [post, setPost] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [otherUser, setOtherUser] = useState(null);

  const getAvatar = (user) => {
    const url = user?.picture || user?.avatar;

    if (!url || url.trim() === '') {
      return placeholderAvatar;
    }

    return url;
  };

  useEffect(() => {
    if (!chatId) return;

    socket.emit("joinChat", chatId);

    return () => {
      socket.off("joinChat");
    };
  }, [chatId]);

  useEffect(() => {
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("newMessage");
    };
  }, []);

  useEffect(() => {
    if (!post?.user?.googleId) return;

    const fetchAuthor = async () => {
      const res = await fetch(
        `${API_ROOT}/profile/google/${post.user.googleId}`
      );
      const data = await res.json();

      setPost((prev) => ({
        ...prev,
        user: data.user,
      }));
    };

    fetchAuthor();
  }, [post?.user?.googleId]);

  useEffect(() => {
    if (!chatId) {
      setError('No chat ID provided');
      setLoading(false);
      return;
    }

    const fetchChat = async () => {
      try {
        const viewerEmail = encodeURIComponent(currentUser?.email || '');
        let chat;
        
        if (isDm) {
          // Fetch DM chat
          const response = await fetch(`${API_ROOT}/chat/dm/${chatId}?viewerEmail=${viewerEmail}`);
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Failed to load DM chat');
          }
          chat = await response.json();
          // For DMs, get the other participant's info
          const otherEmail = chat.participants?.find(p => p.toLowerCase() !== viewerEmail.toLowerCase());
          if (otherEmail) {
            const profileRes = await fetch(`${API_ROOT}/profile/by-email/${encodeURIComponent(otherEmail)}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setOtherUser(profileData.user);
            }
          }
        } else {
          // Fetch post-based chat
          const response = await fetch(`${API_ROOT}/chat/${chatId}?viewerEmail=${viewerEmail}`);
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Failed to load chat');
          }
          chat = await response.json();
        }
        
        setMessages(chat.messages || []);
      } catch (err) {
        console.error('Error loading chat:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId, currentUser?.email]);

  useEffect(() => {
    if (messages.length === 0) return;

    const fetchUsers = async () => {
      const uniqueIds = [...new Set(messages.map(m => m.sender))];
      let cache = loadProfileCache();
      
      const initialMap = {};
      const idsToFetch = [];
      
      uniqueIds.forEach((id) => {
        if (!isCacheExpired(cache[id]) && cache[id]?.user) {
          initialMap[id] = cache[id].user;
        } else {
          idsToFetch.push(id);
        }
      });
      
      // Update state immediately with cached data
      if (Object.keys(initialMap).length > 0) {
        setUsersMap(initialMap); 
      }

      if (idsToFetch.length === 0) return;

      const results = await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const res = await fetch(`${API_ROOT}/profile/${id}`);
            const data = await res.json();
            
            const strippedUser = {
              name: data.user?.name,
              email: data.user?.email,
              picture: data.user?.picture || data.user?.avatar
            };
            
            return { id, user: strippedUser };
          } catch {
            return { id, user: null };
          }
        })
      );

      // Add new fetches to cache
      results.forEach(({ id, user }) => {
        if (user) {
          cache[id] = { user, fetchedAt: Date.now() };
        }
      });

      // Remove expired entries before saving
      const cleanedCache = {};
      Object.keys(cache).forEach(key => {
        if (!isCacheExpired(cache[key])) {
          cleanedCache[key] = cache[key];
        }
      });

      saveProfileCache(cleanedCache);

      // update the state with both old and newly fetched users
      setUsersMap(prevMap => {
        const finalMap = { ...prevMap };
        results.forEach(({ id, user }) => {
          if (user) finalMap[id] = user;
        });
        return finalMap;
      });
    };

    fetchUsers();
  }, [messages]);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_ROOT}/posts/${postId}`);
        if (!res.ok) throw new Error("Failed to load post");

        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error("Error loading post:", err);
      }
    };

    fetchPost();
  }, [postId]);

  // Transform messages to match the expected format
  const transformedMessages = useMemo(() => {
    return messages
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .reverse() // Sort oldest first
    .map(msg => {
      const user = usersMap[msg.sender];
      
      return {
        id: msg._id,
        sender: {
          id: msg.sender,
          name: user?.name || "Unknown",
          username: user?.email || "unknown",
          avatarUrl: getAvatar(user),
          avatarAlt: user?.name || "User",
          avatarFallback: (user?.name || "U")
            .slice(0, 2)
            .toUpperCase()
        },
        content: msg.message,
        timestamp: msg.timestamp
      };
    });
  }, [messages, usersMap]);

  const participantCount = 1 + (post?.riderList?.length || 0) + (post?.drivers?.length || 0);
  const currentEmail = (currentUser?.email || '').trim().toLowerCase();
  const isOwner = currentEmail && (post?.user?.email || '').trim().toLowerCase() === currentEmail;
  const isRider = Array.isArray(post?.riderList)
    && post.riderList.some((rider) => (rider?.email || '').trim().toLowerCase() === currentEmail);
  const isDriver = Array.isArray(post?.drivers)
    && post.drivers.some((driver) => (driver?.email || '').trim().toLowerCase() === currentEmail);
  const canSendMessages = Boolean(currentEmail && (isOwner || isRider || isDriver));
  
  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;

    if (!isDm && !canSendMessages) {
      setError('You can view this chat history, but you are no longer allowed to send messages for this ride.');
      return;
    }

    // FRONTEND VALIDATION: Prevent sending empty messages
    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length === 0) {
      setError('Message cannot be empty');
      return;
    }

    // FRONTEND VALIDATION: Prevent messages exceeding max length
    if (trimmedMessage.length > 10000) {
      setError('Message is too long (max 10,000 characters)');
      return;
    }

    // FRONTEND VALIDATION: Basic XSS check
    const xssPatterns = /<script|javascript:|on\w+\s*=/i;
    if (xssPatterns.test(trimmedMessage)) {
      setError('Invalid characters in message');
      return;
    }

    try {
      const endpoint = isDm 
        ? `${API_ROOT}/chat/dm/${chatId}/messages`
        : `${API_ROOT}/chat/${chatId}/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: currentUser.email || currentUser._id,
          message: trimmedMessage,
          recipientEmail: post?.user?.email, // Optional: for backend validation of self-messaging
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const newMessage = await response.json();
      setMessage('');
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  return (
    <Chat className="h-screen pb-20">
      <ChatHeader className="border-b">
        <ChatHeaderAddon>
          <ChatHeaderButton onClick={() => navigate(-1)}> {/*Go back to previous page*/}
            <ArrowLeft />
          </ChatHeaderButton>
        </ChatHeaderAddon>
        <ChatHeaderMain>
          {isDm ? (
            <>
              <span className="font-medium">{otherUser?.name || 'Direct Message'}</span>
              <span className="text-sm font-semibold">—</span>
              <span className="flex-1 grid">
                <span className="text-sm font-medium truncate">
                  {otherUser?.email || ''}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">{post?.title}</span>
              <span className="text-sm font-semibold">—</span>
              <span className="flex-1 grid">
                <span className="text-sm font-medium truncate">
                  {participantCount} people
                </span>
              </span>
            </>
          )}
        </ChatHeaderMain>
        {!isDm && (
          <ChatHeaderAddon>
            <ChatHeaderButton className="@2xl/chat:inline-flex hidden" onClick={() => setDetailsOpen(true)}>
              <Info />
            </ChatHeaderButton>
          </ChatHeaderAddon>
        )}
      </ChatHeader>

      <ChatMessages className="px-2 sm:px-4 lg:px-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading messages...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : transformedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          transformedMessages.map((msg, i, msgs) => {
            // If date changed, show date item
            if (
              new Date(msg.timestamp).toDateString() !==
              new Date(msgs[i + 1]?.timestamp).toDateString()
            ) {
              return (
                <Fragment key={msg.id}>
                  <PrimaryMessage
                    avatarSrc={msg.sender.avatarUrl}
                    avatarAlt={msg.sender.username}
                    avatarFallback={msg.sender.avatarFallback}
                    senderName={msg.sender.name}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                  <DateItem timestamp={msg.timestamp} className="my-4" />
                </Fragment>
              );
            }

            // If next item is same user, show additional
            if (msg.sender.id === msgs[i + 1]?.sender.id) {
              return (
                <AdditionalMessage
                  key={msg.id}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              );
            }
            // Else, show primary
            else {
              return (
                <PrimaryMessage
                  className="mt-4"
                  key={msg.id}
                  avatarSrc={msg.sender.avatarUrl}
                  avatarAlt={msg.sender.username}
                  avatarFallback={msg.sender.avatarFallback}
                  senderName={msg.sender.name}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              );
            }
          })
        )}
      </ChatMessages>

      <ChatToolbar className="px-2 sm:px-4 lg:px-6">
        <ChatToolbarAddon align="inline-start">
          {/*<ChatToolbarButton>
            <PlusIcon />
          </ChatToolbarButton>*/}
        </ChatToolbarAddon>
        <ChatToolbarTextarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onSubmit={() => handleSendMessage()}
          placeholder={!canSendMessages ? 'cannot sent message in quitted group chat' : 'Type your message...'}
          className={!canSendMessages ? 'text-center placeholder:text-center' : ''}
          disabled={!canSendMessages}
        />
        <ChatToolbarAddon align="inline-end">
          <ChatToolbarButton onClick={handleSendMessage} disabled={!canSendMessages}>
            <SquareChevronRightIcon />
          </ChatToolbarButton>
        </ChatToolbarAddon>
      </ChatToolbar>
      {!canSendMessages && (
        <div className="px-4 pb-2 text-xs text-amber-700">
          You were removed from this ride. Chat history remains visible, but sending new messages is disabled.
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogDescription className="sr-only">
            Detailed view of ride post
          </DialogDescription>
          <DialogHeader>
            <div className='flex items-center gap-3'>
              <DialogTitle className='text-lg font-bold'>{post?.title}</DialogTitle>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${post?.type === 'offer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {post?.type === 'offer' ? 'Offering' : 'Requesting'}
              </span>
            </div>
            {post?.createdAt && (
              <p className='text-xs text-gray-400 flex items-center gap-1 mt-1'>
                Posted {new Date(post.createdAt).toLocaleString()}
              </p>
            )}
          </DialogHeader>

          <div className='space-y-3 text-sm'>
            {/* Contact Section */}
            <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Contact</p>
              {post?.user && (
                <div className='flex items-center gap-3'>
                  <img
                    src={getAvatar(post.user)}
                    alt={post.user.name || 'User'}
                    className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className='text-gray-700 font-medium text-sm break-all'>{post.user.name || '—'}</p>
                    <p className='text-xs text-gray-500 break-all'>{post.user.email || '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Rider List Section */}
            {post?.riderList && post.riderList.length > 0 && (
              <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                  Rider List ({post.riderList.length} {post.riderList.length === 1 ? 'person' : 'people'})
                </p>
                <div className='space-y-2'>
                  {post.riderList.map((rider, idx) => (
                    <div key={idx} className='flex items-center gap-2'>
                      <img
                        src={getAvatar(rider)}
                        alt={rider.name || 'User'}
                        className='w-8 h-8 rounded-full border border-gray-200 object-cover'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium text-sm truncate'>{rider.name || '—'}</p>
                        <p className='text-xs text-gray-500 truncate'>{rider.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description Section */}
            {post?.description && (
              <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Description</p>
                <p className='text-gray-700 break-all whitespace-pre-wrap'>{post.description}</p>
              </div>
            )}

            {/* Trip Details Section */}
            {post?.trip && (
              <div className='bg-gray-50 rounded-lg p-3 space-y-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Route</p>
                {post.trip.startLocation?.title && (
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-400'>From:</p>
                    <p className='font-medium text-sm'>{post.trip.startLocation.title}</p>
                  </div>
                )}
                {post.trip.endLocation?.title && (
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-400'>To:</p>
                    <p className='font-medium text-sm'>{post.trip.endLocation.title}</p>
                  </div>
                )}
                {post.trip.date && (
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-400'>Date:</p>
                    <p className='text-sm'>{post.trip.date}</p>
                  </div>
                )}
                {post.trip.time && (
                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-gray-400'>Time:</p>
                    <p className='text-sm'>{post.trip.time}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogClose asChild>
            <Button variant='outline' className='w-full'>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

    </Chat>
  );
}

export default ChatPage;