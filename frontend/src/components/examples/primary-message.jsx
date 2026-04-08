import { cn } from "@/lib/utils";
import {
  ChatEvent,
  ChatEventAddon,
  ChatEventAvatar,
  ChatEventBody,
  ChatEventContent,
  ChatEventTime,
  ChatEventTitle,
} from "@/components/chat/chat-event";

export function PrimaryMessage({
  avatarSrc,
  avatarAlt,
  avatarFallback,
  senderName,
  content,
  timestamp,
  className
}) {
  return (
    <ChatEvent className={cn("hover:bg-accent", className)}>
      <ChatEventAddon>
        <ChatEventAvatar src={avatarSrc} alt={avatarAlt} fallback={avatarFallback} />
      </ChatEventAddon>
      <ChatEventBody>
        <ChatEventTitle>
          <span className="font-medium">{senderName}</span>
          <ChatEventTime timestamp={timestamp} />
        </ChatEventTitle>
        <ChatEventContent>{content}</ChatEventContent>
      </ChatEventBody>
    </ChatEvent>
  );
}
