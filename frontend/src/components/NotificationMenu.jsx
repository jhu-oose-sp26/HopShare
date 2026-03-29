import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Bell } from "lucide-react";

function NotificationMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className='relative p-3 rounded-full hover:bg-gray-100 transition'>
          <Bell className='w-7 h-7 text-gray-700' />
          <span className='absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white'></span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[350px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            View your ride updates and activity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
            🚗 New ride request near you
          </div>

          <div className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
            ✅ Your ride was accepted
          </div>

          <div className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
            ❌ A request was canceled
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationMenu;