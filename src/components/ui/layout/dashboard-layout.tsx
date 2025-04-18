import { ScrollArea } from "../scroll-area";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] bg-background">
      <div className="h-full flex flex-col px-4 md:px-6 lg:px-8">
        {children}
      </div>
    </ScrollArea>
  );
}
