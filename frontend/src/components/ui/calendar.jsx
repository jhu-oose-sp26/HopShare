import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      fixedWeeks
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "rdp-root w-full",
        months: "flex flex-col gap-2 w-full",
        month: "grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-4 w-full items-center",
        month_caption: "flex justify-center items-center min-h-8",
        caption_label: "text-sm font-medium text-foreground",
        nav: "flex flex-row items-center justify-between w-full gap-1 mb-2",
        button_previous: cn(
          "shrink-0 rounded-md border border-input bg-background opacity-100 hover:bg-accent hover:text-accent-foreground",
          buttonVariants({ variant: "outline", size: "icon-sm" })
        ),
        button_next: cn(
          "shrink-0 rounded-md border border-input bg-background opacity-100 hover:bg-accent hover:text-accent-foreground",
          buttonVariants({ variant: "outline", size: "icon-sm" })
        ),
        month_grid: "w-full border-collapse space-y-1 mt-1 col-span-3",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        weeks: "min-h-[16.5rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button:
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="size-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
