import { cn } from "@/lib/utils";

import { ScrollArea } from "../scroll-area";

// Props definition
type PageLayoutProps = {
  children: React.ReactNode;
} & React.ComponentProps<typeof ScrollArea>;

type PageLayoutHeaderProps = {
  children: React.ReactNode;
} & React.ComponentProps<"div">;

type PageLayoutContentProps = {
  children: React.ReactNode;
} & React.ComponentProps<"div">;

// Header component
function PageLayoutHeader({
  children,
  className,
  ...props
}: PageLayoutHeaderProps) {
  return (
    <div
      className={cn(
        "w-full sticky top-0 z-10 isolate bg-white md:px-6 lg:px-8 px-4 min-h-16 py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Content component
function PageLayoutContent({
  children,
  className,
  ...props
}: PageLayoutContentProps) {
  return (
    <div
      className={cn(
        "h-full flex flex-col px-4 md:px-6 lg:px-8 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Main layout component
function PageLayout({ children, className, ...props }: PageLayoutProps) {
  return (
    <ScrollArea
      className={cn(
        "flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </ScrollArea>
  );
}

export { PageLayout, PageLayoutHeader, PageLayoutContent };
