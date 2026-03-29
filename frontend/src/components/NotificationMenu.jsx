import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

function NotificationMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='relative p-3 rounded-full hover:bg-gray-100 transition'>
          <Bell className='w-7 h-7 text-gray-700' />
          <span className='absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white'></span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem>🚗 New ride request near you</DropdownMenuItem>
        <DropdownMenuItem>✅ Your ride was accepted</DropdownMenuItem>
        <DropdownMenuItem>❌ A request was canceled</DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center text-sm text-gray-500">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationMenu;