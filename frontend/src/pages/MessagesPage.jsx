import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Clock, ChevronRight } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const MessagesPage = ({ currentUser }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_ROOT}/chat/user/${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();
        setChats(data);
      } catch (err) {
        console.error(err);
        setError('Could not load messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUser]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentUser) {
    return (
      <div className="pb-20 p-4 text-center mt-10">
        <p className="text-gray-500">Please log in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900">
        <MessageCircle className="w-6 h-6 text-blue-600" />
        Messages
      </h1>

      {loading ? (
        <div className="text-center py-10 text-gray-500 animate-pulse">
          Loading messages...
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">
          {error}
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-1">No messages yet</p>
          <p className="text-sm text-gray-400">Chats from your rides will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => navigate('/chat', { state: { chatId: chat._id, postId: chat.postId } })}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-gray-900 truncate mb-1">
                  {chat.postTitle}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage
                    ? (
                      <>
                        <span className="font-medium text-gray-700">
                          {chat.lastMessage.sender === currentUser.email ? 'You' : chat.lastMessage.sender.split('@')[0]}
                        </span>
                        : {chat.lastMessage.message}
                      </>
                    )
                    : <span className="italic">No messages yet. Say hi!</span>
                  }
                </p>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-2">
                {chat.lastMessage && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(chat.lastMessage.timestamp)}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
