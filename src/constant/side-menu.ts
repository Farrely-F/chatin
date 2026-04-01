import {
  Activity,
  BookText,
  Bot,
  Code2Icon,
  Home,
  KeyIcon,
  LogOut,
  type LucideIcon,
  MessageCircleMore,
  SendIcon,
  UserCircle,
  UserPen,
  Wrench,
} from "lucide-react";

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  disabled: boolean;
  permission?: string;
};

type NavGroup = {
  title: string;
  url: string;
  disabled: boolean;
  permission?: string;
  items: NavItem[];
};

type FooterAction = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

export const data: {
  navMain: NavGroup[];
  footerAction: FooterAction[];
} = {
  navMain: [
    {
      title: "Navigation",
      url: "#",
      disabled: false,
      items: [
        {
          title: "Home",
          url: "/dashboard",
          icon: Home,
          disabled: false,
        },
        {
          permission: "agent.read",
          title: "Agents",
          url: "/dashboard/agents",
          icon: Bot,
          disabled: false,
        },
        {
          permission: "persona.read",
          title: "Personas",
          url: "/dashboard/personas",
          icon: UserPen,
          disabled: false,
        },
      ],
    },
    {
      title: "System",
      url: "#",
      disabled: false,
      permission: "system.read",
      items: [
        {
          title: "User Management",
          url: "/dashboard/user-management",
          icon: UserCircle,
          disabled: false,
        },
        {
          title: "Permission",
          url: "/dashboard/roles-and-permissions",
          icon: KeyIcon,
          disabled: false,
        },
        {
          title: "Model Management",
          url: "/dashboard/model-management",
          icon: Wrench,
          disabled: false,
        },
        {
          title: "Monitoring",
          url: "/dashboard/monitoring",
          icon: Activity,
          disabled: false,
        },
      ],
    },
    {
      title: "Integration",
      url: "#",
      disabled: true,
      items: [
        {
          title: "Telegram",
          url: "",
          icon: SendIcon,
          disabled: true,
        },
        {
          title: "WhatsApp",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
        },
        {
          title: "Widget",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
        },
      ],
    },
    {
      title: "Developer",
      url: "#",
      disabled: false,
      permission: "developer.read",
      items: [
        {
          permission: "developer.create",
          title: "API",
          url: "/dashboard/api-keys",
          icon: Code2Icon,
          disabled: false,
        },
        {
          permission: "developer.read",
          title: "Documentation",
          url: "",
          icon: BookText,
          disabled: true,
        },
      ],
    },
  ],
  footerAction: [
    {
      title: "Logout",
      url: "",
      icon: LogOut,
    },
  ],
};
