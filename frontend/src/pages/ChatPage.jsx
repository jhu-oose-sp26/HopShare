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
import { MESSAGES } from '@/data/examples/messages';
import { AdditionalMessage } from '@/components/examples/additional-message';
import { PrimaryMessage } from '@/components/examples/primary-message';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateItem } from '@/components/examples/date-item';

const ChatPage = () => {
  const navigate = useNavigate();

  return (
    <Chat className="h-screen pb-20">
      <ChatHeader className="border-b">
        <ChatHeaderAddon>
          <ChatHeaderButton onClick={() => navigate(-1)}>
            <ArrowLeft /> {/*CONFIGURE BACK*/}
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
        {MESSAGES.map((msg, i, msgs) => {
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
                  avatarFallback={msg.sender.name.slice(0, 2)}
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
                avatarFallback={msg.sender.name.slice(0, 2)}
                senderName={msg.sender.name}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            );
          }
        })}
      </ChatMessages>

      <ChatToolbar className="px-2 sm:px-4 lg:px-6">
        <ChatToolbarAddon align="inline-start">
          {/*<ChatToolbarButton>
            <PlusIcon />
          </ChatToolbarButton>*/}
        </ChatToolbarAddon>
        <ChatToolbarTextarea
          onChange={(e) => setMessage(e.target.value)}
          onSubmit={() => handleSendMessage()}
        />
        <ChatToolbarAddon align="inline-end">
          <ChatToolbarButton>
            <SquareChevronRightIcon />  {/*CONFIGURE SEND*/}
          </ChatToolbarButton>
        </ChatToolbarAddon>
      </ChatToolbar>

    </Chat>
  );
}

export default ChatPage;