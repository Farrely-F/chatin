import {
  Activity,
  BookText,
  Bot,
  Building,
  Building2,
  Code2Icon,
  DollarSign,
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
          title: "Manage Organizations",
          url: "/dashboard/organizations",
          icon: Building2,
          disabled: false,
          permission: "system.read",
        },
        {
          title: "User Management",
          url: "/dashboard/user-management",
          icon: UserCircle,
          disabled: false,
          permission: "system.read",
        },
        {
          title: "Permission",
          url: "/dashboard/roles-and-permissions",
          icon: KeyIcon,
          disabled: false,
          permission: "system.read",
        },
        {
          title: "Model Management",
          url: "/dashboard/model-management",
          icon: Wrench,
          disabled: false,
          permission: "system.read",
        },
        {
          title: "Monitoring",
          url: "/dashboard/monitoring",
          icon: Activity,
          disabled: false,
          permission: "system.read",
        },
      ],
    },
    {
      title: "Workspace",
      url: "#",
      disabled: false,
      permission: "organization.manage",
      items: [
        {
          title: "Monitor Usage",
          url: "/dashboard/monitoring/organization",
          icon: DollarSign,
          disabled: false,
          permission: "organization.manage",
        },
        {
          title: "Organization",
          url: "/dashboard/workspace/organization",
          icon: Building,
          disabled: false,
          permission: "organization.manage",
        },
      ],
    },
    {
      title: "Integration",
      url: "#",
      disabled: true,
      permission: "integration.read",
      items: [
        {
          title: "Telegram",
          url: "",
          icon: SendIcon,
          disabled: true,
          permission: "integration.telegram",
        },
        {
          title: "WhatsApp",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
          permission: "integration.whatsapp",
        },
        {
          title: "Widget",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
          permission: "integration.widget",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      disabled: false,
      permission: "resources.read",
      items: [
        {
          permission: "resources.api.read",
          title: "API",
          url: "/dashboard/api-keys",
          icon: Code2Icon,
          disabled: false,
        },
        {
          permission: "resources.documentation.read",
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
