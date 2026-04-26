import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Info, SquareChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';
import { Chat } from '@/components/chat/chat';
import {
  ChatHeader,
  ChatHeaderAddon,
  ChatHeaderButton,
  ChatHeaderMain,
} from '@/components/chat/chat-header';
import { ChatMessages } from '@/components/chat/chat-messages';
import {
  ChatToolbar,
  ChatToolbarAddon,
  ChatToolbarTextarea,
  ChatToolbarButton,
} from '@/components/chat/chat-toolbar';
import { PrimaryMessage } from '@/components/examples/primary-message';
import { AdditionalMessage } from '@/components/examples/additional-message';
import { DateItem } from '@/components/examples/date-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import placeholderAvatar from '@/user-placeholder.png';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ROOT;
const PROFILE_CACHE_KEY = 'profileCache';
const PROFILE_CACHE_TTL = 1000 * 60 * 60 * 24;

const socket = io(SOCKET_URL);

const loadProfileCache = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || '{}'); }
  catch { return {}; }
};
const saveProfileCache = (cache) => {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
};
const isCacheExpired = (entry) =>
  !entry?.fetchedAt || Date.now() - entry.fetchedAt > PROFILE_CACHE_TTL;

const getAvatar = (user) => {
  const url = user?.picture || user?.avatar;
  return !url || url.trim() === '' ? placeholderAvatar : url;
};

const formatChatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function MessagesPage({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialState = location.state || {};
  
  // ── Chat list ────────────────────────────────────────────────────────────
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  // ── Selected chat ────────────────────────────────────────────────────────
  const [selectedChatId, setSelectedChatId] = useState(null);
  const selectedChatIdRef = useRef(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isDmChat, setIsDmChat] = useState(false);

  // ── Chat view ────────────────────────────────────────────────────────────
  const [post, setPost] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const usersMapRef = useRef({});
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ── Mobile panel toggle ───────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState('list');

  // ── Fetch chat list ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email) { setChatsLoading(false); return; }
    
    const fetchChats = async () => {
      try {
        // Fetch both post-based chats and DM chats
        const [postChatsRes, dmChatsRes] = await Promise.all([
          fetch(`${API_ROOT}/chat/user/${encodeURIComponent(currentUser.email)}`),
          fetch(`${API_ROOT}/chat/dm/user/${encodeURIComponent(currentUser.email)}`)
        ]);
        
        const postChats = await postChatsRes.json();
        const dmChats = await dmChatsRes.json();
        
        // Combine and sort by updatedAt
        const allChats = [
          ...(Array.isArray(postChats) ? postChats : []),
          ...(Array.isArray(dmChats) ? dmChats : [])
        ];
        allChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        setChats(allChats);
      } catch (err) {
        console.error('Failed to load chats:', err);
        setChats([]);
      } finally {
        setChatsLoading(false);
      }
    };
    
    fetchChats();
  }, [currentUser]);

  // ── Handle initial state from navigation (DM from UserProfile) ────────────
  useEffect(() => {
    if (initialState.chatId && initialState.isDm) {
      // Find the chat in the list or select it directly
      const existingChat = chats.find(c => c._id === initialState.chatId);
      if (existingChat) {
        handleSelectChat(existingChat);
      } else {
        // Chat not in list yet, set it as selected
        setSelectedChatId(initialState.chatId);
        selectedChatIdRef.current = initialState.chatId;
        setIsDmChat(true);
        setMobileView('chat');
      }
    }
  }, [initialState, chats]);

  // ── Select a chat ─────────────────────────────────────────────────────────
  const handleSelectChat = (chat) => {
    if (selectedChatId === chat._id) return;

    // Leave old room
    if (selectedChatIdRef.current) {
      socket.emit('leaveChat', selectedChatIdRef.current);
    }

    setSelectedChatId(chat._id);
    selectedChatIdRef.current = chat._id;

    const prevChatId = selectedChatIdRef.current; // when switching chats 

    if (prevChatId && prevChatId !== chat._id) {
      const prevChat = chats.find(c => c._id === prevChatId);

      if (prevChat?.unreadCount?.[currentUser.email] > 0) {
        fetch(`${API_ROOT}/chat/${prevChatId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: currentUser.email }),
        }).catch(() => {});
      }
    }

    setChats(prev =>
      prev.map(c =>
        c._id === chat._id
          ? {
              ...c,
              unreadCount: {
                ...c.unreadCount,
                [currentUser.email]: 0,
              },
            }
          : c
      )
    );

    setSelectedPostId(chat.postId);
    setIsDmChat(chat.type === 'dm');
    setMessages([]);
    setPost(null);
    setUsersMap({});
    setChatError(null);
    setMessageText('');
    setMobileView('chat');

    if ((chat.unreadCount?.[currentUser.email] || 0) > 0) {
      fetch(`${API_ROOT}/chat/${chat._id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentUser.email }),
      }).catch(err => console.error('Failed to reset unread:', err));

      setChats(prev =>
        prev.map(c =>
          c._id === chat._id
            ? {
                ...c,
                unreadCount: {
                  ...c.unreadCount,
                  [currentUser.email]: 0,
                },
              }
            : c
        )
      );
    }
  };

  // ── Socket: join room & listen ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChatId) return;
    socket.emit('joinChat', selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    const handler = (msg) => {
      if (msg.chatId && msg.chatId !== selectedChatIdRef.current) return;
      const senderName = usersMapRef.current[msg.sender]?.name || null;
      setMessages(prev => [...prev, msg]);
      setChats(prev => prev.map(c =>
        c._id === (msg.chatId ?? selectedChatIdRef.current)
          ? { ...c, lastMessage: { sender: msg.sender, message: msg.message, timestamp: msg.timestamp, senderName } }
          : c
      ));
    };
    socket.on('newMessage', handler);
    return () => socket.off('newMessage', handler);
  }, []);

  useEffect(() => {
    const handleUnreadUpdate = ({ chatId, sender }) => {
      if (sender === currentUser?.email) return;

      setChats(prev =>
        prev.map(chat =>
          chat._id === chatId
            ? {
                ...chat,
                unreadCount: {
                  ...chat.unreadCount,
                  [currentUser.email]:
                    (chat.unreadCount?.[currentUser.email] || 0) + 1,
                },
              }
            : chat
        )
      );
    };

    socket.on('unreadUpdate', handleUnreadUpdate);

    return () => socket.off('unreadUpdate', handleUnreadUpdate);
  }, [currentUser?.email]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChatId) return;
    setChatLoading(true);
    const viewerEmail = encodeURIComponent(currentUser?.email || '');
    const url = isDmChat
      ? `${API_ROOT}/chat/dm/${selectedChatId}?viewerEmail=${viewerEmail}`
      : `${API_ROOT}/chat/${selectedChatId}?viewerEmail=${viewerEmail}`;
    fetch(url)
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error || 'Failed to load chat')));
        return r.json();
      })
      .then(data => setMessages(data.messages || []))
      .catch(err => setChatError(err.message))
      .finally(() => setChatLoading(false));
  }, [selectedChatId, isDmChat, currentUser?.email]);

  // ── Fetch post details ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPostId) return;
    fetch(`${API_ROOT}/posts/${selectedPostId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(data => setPost(data))
      .catch(err => console.error('Error loading post:', err));
  }, [selectedPostId]);

  // ── Fetch user profiles for messages ─────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const uniqueIds = [...new Set(messages.map(m => m.sender))];
    let cache = loadProfileCache();
    const initialMap = {};
    const toFetch = [];

    uniqueIds.forEach(id => {
      const cached = cache[id];
      if (!isCacheExpired(cached) && cached?.user && 'googleId' in cached.user) {
        initialMap[id] = cached.user;
      } else {
        toFetch.push(id);
      }
    });

    if (Object.keys(initialMap).length > 0) setUsersMap(initialMap);
    if (toFetch.length === 0) return;

    Promise.all(toFetch.map(async id => {
      try {
        const isEmail = id.includes('@');
        const url = isEmail
          ? `${API_ROOT}/profile/by-email/${encodeURIComponent(id)}`
          : `${API_ROOT}/profile/${id}`;
        const res = await fetch(url);
        const data = await res.json();
        return { id, user: { name: data.user?.name, email: data.user?.email, picture: data.user?.picture || data.user?.avatar, googleId: data.user?.googleId } };
      } catch { return { id, user: null }; }
    })).then(results => {
      results.forEach(({ id, user }) => { if (user) cache[id] = { user, fetchedAt: Date.now() }; });
      saveProfileCache(Object.fromEntries(Object.entries(cache).filter(([, v]) => !isCacheExpired(v))));
      setUsersMap(prev => {
        const next = { ...prev };
        results.forEach(({ id, user }) => { if (user) next[id] = user; });
        usersMapRef.current = next;
        return next;
      });
    });
  }, [messages]);

  // ── Transform messages ────────────────────────────────────────────────────
  const transformedMessages = useMemo(() => (
    messages
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .reverse()
      .map(msg => {
        const user = usersMap[msg.sender];
        return {
          id: msg._id,
          sender: {
            id: msg.sender,
            name: user?.name || 'Unknown',
            username: user?.email || 'unknown',
            avatarUrl: getAvatar(user),
            avatarAlt: user?.name || 'User',
            avatarFallback: (user?.name || 'U').slice(0, 2).toUpperCase(),
            googleId: user?.googleId || null,
          },
          content: msg.message,
          timestamp: msg.timestamp,
        };
      })
  ), [messages, usersMap]);

  const roleMap = useMemo(() => {
    if (!post) return {};
    const map = {};
    if (post.user?.email) map[post.user.email] = 'Author';
    (post.riderList || []).forEach(r => { if (r.email) map[r.email] = 'Rider'; });
    (post.drivers || []).forEach(d => { if (d.email) map[d.email] = 'Driver'; });
    return map;
  }, [post]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedChatId) return;
    if (trimmed.length > 10000) { setChatError('Message too long (max 10,000 characters)'); return; }
    if (/<script|javascript:|on\w+\s*=/i.test(trimmed)) { setChatError('Invalid characters in message'); return; }

    try {
      const endpoint = isDmChat 
        ? `${API_ROOT}/chat/dm/${selectedChatId}/messages`
        : `${API_ROOT}/chat/${selectedChatId}/messages`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser.email || currentUser._id, message: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessageText('');
      setChatError(null);
    } catch (err) {
      setChatError(err.message || 'Failed to send message');
    }
  };

  const participantCount = 1 + (post?.riderList?.length || 0) + (post?.drivers?.length || 0);
  const selectedChat = chats.find(c => c._id === selectedChatId);

  if (!currentUser) {
    return (
      <div className="p-4 text-center mt-10 pb-20">
        <p className="text-gray-500">Please log in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="flex bg-white" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── LEFT PANEL: conversation list ─────────────────────────────────── */}
      <div className={`
        flex-shrink-0 w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <p className="p-4 text-sm text-gray-400 animate-pulse">Loading…</p>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Chats from your rides will appear here.</p>
            </div>
          ) : (
            chats.map(chat => {
              const isActive = chat._id === selectedChatId;
              const unreadForMe = chat.unreadCount?.[currentUser.email] || 0;
              return (
                <button
                  key={chat._id}
                  onClick={() => handleSelectChat(chat)}
                  className={`
                    w-full text-left px-4 py-4 border-b border-gray-100 transition-colors
                    ${isActive
                      ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                      : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                    }
                  `}
                >
                  {/* Title + timestamp */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className={`font-semibold text-sm leading-snug ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                      {chat.type === 'dm' 
                        ? (chat.otherUser?.name || chat.otherUser?.email || 'Direct Message')
                        : (chat.postTitle && chat.postTitle !== 'Unknown Ride' ? chat.postTitle : 'Untitled ride')
                      }
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      {unreadForMe > 0 && (
                        <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                          {unreadForMe > 99 ? '99+' : unreadForMe}
                        </span>
                      )}

                      {chat.lastMessage?.timestamp && (
                        <span className="text-xs text-gray-400 mt-0.5">
                          {formatChatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date / time / people */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                    {chat.type === 'dm' ? (
                      <span className="text-xs text-gray-500">💬 Direct Message</span>
                    ) : (
                      <>
                        {chat.tripDate && (
                          <span className="text-xs text-gray-500">
                            📅 {chat.tripDate}
                          </span>
                        )}
                        {chat.tripTime && (
                          <span className="text-xs text-gray-500">
                            🕐 {chat.tripTime}
                          </span>
                        )}
                        {chat.participantCount != null && (
                          <span className="text-xs text-gray-500">
                            👥 {chat.participantCount} {chat.participantCount === 1 ? 'person' : 'people'}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Last message */}
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage
                      ? `${chat.lastMessage.sender === currentUser.email ? 'You' : (chat.lastMessage.senderName || (chat.type === 'dm' ? (chat.otherUser?.name || chat.otherUser?.email) : 'Unknown'))}: ${chat.lastMessage.message}`
                      : <span className="italic">No messages yet</span>
                    }
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: chat view ────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!selectedChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <MessageCircle className="w-16 h-16 text-gray-200 mb-4" />
            <p className="font-medium text-gray-500">Select a conversation</p>
            <p className="text-sm mt-1">Choose a chat from the list on the left.</p>
          </div>
        ) : (
          <Chat className="h-full">
            {/* Header */}
            <ChatHeader className="border-b">
              <ChatHeaderAddon>
                <ChatHeaderButton className="md:hidden" onClick={() => setMobileView('list')}>
                  <ArrowLeft />
                </ChatHeaderButton>
              </ChatHeaderAddon>
              <ChatHeaderMain>
                <span className="font-semibold truncate">
                  {isDmChat 
                    ? (selectedChat?.otherUser?.name || selectedChat?.otherUser?.email || 'Direct Message')
                    : (selectedChat?.postTitle || post?.title || '…')
                  }
                </span>
                {!isDmChat && participantCount > 0 && (
                  <span className="text-sm text-gray-500 shrink-0">{participantCount} {participantCount === 1 ? 'person' : 'people'}</span>
                )}
              </ChatHeaderMain>
              <ChatHeaderAddon>
                <ChatHeaderButton onClick={() => {
                  if (isDmChat) {
                    const otherUser = selectedChat?.otherUser;
                    if (otherUser?._id) {
                      navigate(`/user/${otherUser.googleId}`);
                    }
                  } else {
                    setDetailsOpen(true);
                  }
                }}>
                  <Info />
                </ChatHeaderButton>
              </ChatHeaderAddon>
            </ChatHeader>

            {/* Messages */}
            <ChatMessages className="px-2 sm:px-4 lg:px-6">
              {chatLoading ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-sm text-gray-400 animate-pulse">Loading messages…</p>
                </div>
              ) : chatError ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-sm text-red-500">{chatError}</p>
                </div>
              ) : transformedMessages.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-sm text-gray-400">No messages yet. Say hi!</p>
                </div>
              ) : (
                transformedMessages.map((msg, i, msgs) => {
                  const dateChanged = new Date(msg.timestamp).toDateString() !== new Date(msgs[i + 1]?.timestamp).toDateString();
                  const sameAsPrev = msg.sender.id === msgs[i + 1]?.sender.id;

                  if (dateChanged) {
                    return (
                      <Fragment key={msg.id}>
                        <PrimaryMessage
                          avatarSrc={msg.sender.avatarUrl}
                          avatarAlt={msg.sender.username}
                          avatarFallback={msg.sender.avatarFallback}
                          senderName={msg.sender.name}
                          senderTag={!isDmChat ? roleMap[msg.sender.username] : undefined}
                          content={msg.content}
                          timestamp={msg.timestamp}
                          onAvatarClick={msg.sender.googleId ? () => navigate(`/user/${msg.sender.googleId}`) : undefined}
                        />
                        <DateItem timestamp={msg.timestamp} className="my-4" />
                      </Fragment>
                    );
                  }

                  if (sameAsPrev) {
                    return <AdditionalMessage key={msg.id} content={msg.content} timestamp={msg.timestamp} />;
                  }

                  return (
                    <PrimaryMessage
                      className="mt-4"
                      key={msg.id}
                      avatarSrc={msg.sender.avatarUrl}
                      avatarAlt={msg.sender.username}
                      avatarFallback={msg.sender.avatarFallback}
                      senderName={msg.sender.name}
                      senderTag={!isDmChat ? roleMap[msg.sender.username] : undefined}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      onAvatarClick={msg.sender.googleId ? () => navigate(`/user/${msg.sender.googleId}`) : undefined}
                    />
                  );
                })
              )}
            </ChatMessages>

            {/* Input */}
            <ChatToolbar className="px-2 sm:px-4 lg:px-6">
              <ChatToolbarAddon align="inline-start" />
              <ChatToolbarTextarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onSubmit={handleSendMessage}
              />
              <ChatToolbarAddon align="inline-end">
                <ChatToolbarButton onClick={handleSendMessage}>
                  <SquareChevronRight />
                </ChatToolbarButton>
              </ChatToolbarAddon>
            </ChatToolbar>
          </Chat>
        )}
      </div>

      {/* ── Post details dialog ───────────────────────────────────────────── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogDescription className="sr-only">Ride post details</DialogDescription>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-bold">{post?.title}</DialogTitle>
              {post?.type && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${post.type === 'offer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {post.type === 'offer' ? 'Offering' : 'Requesting'}
                </span>
              )}
            </div>
            {post?.createdAt && (
              <p className="text-xs text-gray-400 mt-1">Posted {new Date(post.createdAt).toLocaleString()}</p>
            )}
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {post?.user && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact</p>
                <div className="flex items-center gap-3">
                  <img src={getAvatar(post.user)} alt={post.user.name || 'User'} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                  <div className="min-w-0">
                    <p className="text-gray-700 font-medium text-sm">{post.user.name || '—'}</p>
                    <p className="text-xs text-gray-500">{post.user.email || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {post?.riderList?.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Riders ({post.riderList.length})
                </p>
                <div className="space-y-2">
                  {post.riderList.map((rider, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <img src={getAvatar(rider)} alt={rider.name || 'Rider'} className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{rider.name || '—'}</p>
                        <p className="text-xs text-gray-500 truncate">{rider.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {post?.description && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
              </div>
            )}

            {post?.trip && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Route</p>
                {[
                  { label: 'From', value: post.trip.startLocation?.title },
                  { label: 'To',   value: post.trip.endLocation?.title },
                  { label: 'Date', value: post.trip.date },
                  { label: 'Time', value: post.trip.time },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <p className="text-xs text-gray-400 w-8">{label}:</p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-2">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
