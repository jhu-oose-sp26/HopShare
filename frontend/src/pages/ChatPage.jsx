import { Chat } from '../components/chat/chat';
import { ChatHeader } from '../components/chat/chat-header';
import { ChatMessages } from '../components/chat/chat-messages';
import { ChatToolbar } from '../components/chat/chat-toolbar';

function ChatPage() {
  return (
    <Chat className="h-screen">
      <ChatHeader>Chat Header</ChatHeader>

      <ChatMessages>
        Messages go here
      </ChatMessages>

      <ChatToolbar>
        Toolbar here
      </ChatToolbar>
    </Chat>
  );
}

export default ChatPage;