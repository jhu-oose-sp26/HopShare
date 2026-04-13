/**
 * @module chat-header
 *
 * Sticky header components for the chat UI. Compose `ChatHeaderMain`,
 * `ChatHeaderAddon`, `ChatHeaderAvatar`, and `ChatHeaderButton` inside
 * a `ChatHeader` container to build the header layout.
 *
 * Typical structure:
 * ```
 * ChatHeader
 * ├── ChatHeaderAddon          ← left-side items (avatar, back button)
 * ├── ChatHeaderMain           ← center content (takes remaining space)
 * └── ChatHeaderAddon          ← right-side items (action buttons)
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/**
 * Sticky header container for the chat. Renders as a flex row pinned
 * to the top of the `Chat` container.
 *
 * @example
 * ```tsx
 * <ChatHeader className="border-b">
 *   <ChatHeaderAddon>
 *     <ChatHeaderAvatar src="/avatar.png" alt="@user" fallback="AS" />
 *   </ChatHeaderAddon>
 *   <ChatHeaderMain>
 *     <span className="font-medium">Ann Smith</span>
 *   </ChatHeaderMain>
 *   <ChatHeaderAddon>
 *     <ChatHeaderButton><PhoneIcon /></ChatHeaderButton>
 *     <ChatHeaderButton><MoreHorizontalIcon /></ChatHeaderButton>
 *   </ChatHeaderAddon>
 * </ChatHeader>
 * ```
 */
export function ChatHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 p-2 bg-background flex items-center gap-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Primary content area of the header. Uses `flex-1` to take remaining
 * horizontal space between `ChatHeaderAddon` groups.
 *
 * @example
 * ```tsx
 * <ChatHeaderMain>
 *   <span className="font-medium">Ann Smith</span>
 *   <span className="flex-1 grid">
 *     <span className="text-sm font-medium truncate">Front-end developer</span>
 *   </span>
 * </ChatHeaderMain>
 * ```
 */
export function ChatHeaderMain({
  children,
  className,
  ...props
}) {
  return (
    <div className={cn("flex-1 flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Groups supplementary items (avatars, buttons, inputs) on either side
 * of the header. Place one before `ChatHeaderMain` for the left side
 * and one after for the right side.
 *
 * @example
 * ```tsx
 * // Left side
 * <ChatHeaderAddon>
 *   <ChatHeaderAvatar src="/avatar.png" alt="@user" fallback="AS" />
 * </ChatHeaderAddon>
 *
 * // Right side
 * <ChatHeaderAddon>
 *   <ChatHeaderButton><PhoneIcon /></ChatHeaderButton>
 *   <ChatHeaderButton><VideoIcon /></ChatHeaderButton>
 * </ChatHeaderAddon>
 * ```
 */
export function ChatHeaderAddon({
  children,
  className,
  ...props
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Avatar component sized for the header. Built on Radix UI Avatar
 * primitives with rounded styling.
 *
 * @example
 * ```tsx
 * <ChatHeaderAvatar
 *   src="https://example.com/avatar.png"
 *   alt="@annsmith"
 *   fallback="AS"
 * />
 * ```
 */
export function ChatHeaderAvatar({
  className,
  src,
  alt,
  fallback,
  imageProps,
  fallbackProps,
  ...props
}) {
  return (
    <Avatar className={cn("rounded-full", className)} {...props}>
      <AvatarImage src={src} alt={alt} {...imageProps} />
      {fallback && (
        <AvatarFallback {...fallbackProps}>{fallback}</AvatarFallback>
      )}
    </Avatar>
  );
}

/**
 * Pre-styled ghost icon button for header actions (phone, video, menu, etc.).
 * Uses `variant="ghost"` and `size="icon-sm"`.
 *
 * @example
 * ```tsx
 * <ChatHeaderButton>
 *   <MoreHorizontalIcon />
 * </ChatHeaderButton>
 * ```
 */
export function ChatHeaderButton({
  children,
  className,
  ...props
}) {
  return (
    <Button variant="ghost" size="icon-sm" className={cn(className)} {...props}>
      {children}
    </Button>
  );
}
