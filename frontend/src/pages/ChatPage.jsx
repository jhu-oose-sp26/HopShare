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
import { Fragment, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DateItem } from '@/components/examples/date-item';

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId, postId } = location.state || {};

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!chatId) {
      setError('No chat ID provided');
      setLoading(false);
      return;
    }

    const fetchChat = async () => {
      try {
        const response = await fetch(`http://localhost:3000/chat/${chatId}`);
        if (!response.ok) {
          throw new Error('Failed to load chat');
        }
        const chat = await response.json();
        setMessages(chat.messages || []);
      } catch (err) {
        console.error('Error loading chat:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId]);

  // Transform messages to match the expected format
  const transformedMessages = messages
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .reverse() // Sort oldest first
    .map(msg => ({
      id: msg._id,
      sender: {
        id: msg.sender,
        name: msg.sender, // Assuming sender is email or name
        username: msg.sender,
        avatarUrl: '', // TODO: get avatar from user data
        avatarAlt: msg.sender,
        avatarFallback: msg.sender.slice(0, 2).toUpperCase()
      },
      content: msg.message,
      timestamp: msg.timestamp
    }));

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;

    try {
      const response = await fetch(`http://localhost:3000/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'currentUser@example.com', // TODO: get from current user context
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
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
          <span className="font-medium">Ann Smith</span>
          <span className="text-sm font-semibold">AKA</span>
          <span className="flex-1 grid">
            <span className="text-sm font-medium truncate">
              Front-end developer
            </span>
          </span>
        </ChatHeaderMain>
        <ChatHeaderAddon>
          <ChatHeaderButton className="@2xl/chat:inline-flex hidden">
            <Info />
          </ChatHeaderButton>
        </ChatHeaderAddon>
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
        />
        <ChatToolbarAddon align="inline-end">
          <ChatToolbarButton onClick={handleSendMessage}>
            <SquareChevronRightIcon />
          </ChatToolbarButton>
        </ChatToolbarAddon>
      </ChatToolbar>

    </Chat>
  );
}

export default ChatPage;