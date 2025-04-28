"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Editor, Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Type,
  Undo,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={cn(
            "h-8 w-8 p-0 rounded-md",
            isActive && "bg-muted text-primary",
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="dark">{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Custom extension for keyboard shortcuts
const CustomKeyboardShortcuts = Extension.create({
  name: "customKeyboardShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-Alt-0": () => {
        return this.editor.commands.setParagraph();
      },
      "Mod-Alt-1": () => {
        return this.editor.commands.toggleHeading({ level: 1 });
      },
      "Mod-Alt-2": () => {
        return this.editor.commands.toggleHeading({ level: 2 });
      },
      "Mod-Alt-3": () => {
        return this.editor.commands.toggleHeading({ level: 3 });
      },
      "Mod-Alt-4": () => {
        return this.editor.commands.toggleHeading({ level: 4 });
      },
      "Mod-Alt-5": () => {
        return this.editor.commands.toggleHeading({ level: 5 });
      },
      "Mod-Alt-6": () => {
        return this.editor.commands.toggleHeading({ level: 6 });
      },
    };
  },
});

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Write something...",
  editable = true,
  className,
}: RichTextEditorProps) {
  const [headingValue, setHeadingValue] = useState("paragraph");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
      CustomKeyboardShortcuts,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      updateHeadingValue(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateHeadingValue(editor);
    },
    autofocus: "end",
    immediatelyRender: false,
  });

  const updateHeadingValue = (editor: Editor) => {
    if (editor.isActive("heading", { level: 1 })) {
      setHeadingValue("h1");
    } else if (editor.isActive("heading", { level: 2 })) {
      setHeadingValue("h2");
    } else if (editor.isActive("heading", { level: 3 })) {
      setHeadingValue("h3");
    } else if (editor.isActive("heading", { level: 4 })) {
      setHeadingValue("h4");
    } else if (editor.isActive("heading", { level: 5 })) {
      setHeadingValue("h5");
    } else if (editor.isActive("heading", { level: 6 })) {
      setHeadingValue("h6");
    } else {
      setHeadingValue("paragraph");
    }
  };

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("Image URL");

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleHeadingChange = (value: string) => {
    if (!editor) return;

    setHeadingValue(value);

    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (value === "h1") {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (value === "h2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (value === "h3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    } else if (value === "h4") {
      editor.chain().focus().toggleHeading({ level: 4 }).run();
    } else if (value === "h5") {
      editor.chain().focus().toggleHeading({ level: 5 }).run();
    } else if (value === "h6") {
      editor.chain().focus().toggleHeading({ level: 6 }).run();
    }
  };

  // Function to get display text for the selected heading
  const getHeadingDisplayText = (value: string) => {
    switch (value) {
      case "h1":
        return "Heading 1";
      case "h2":
        return "Heading 2";
      case "h3":
        return "Heading 3";
      case "h4":
        return "Heading 4";
      case "h5":
        return "Heading 5";
      case "h6":
        return "Heading 6";
      default:
        return "Paragraph";
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border rounded-md", className)}>
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
          width: 100%;
          min-height: 150px;
        }
        .ProseMirror:focus {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/40">
        <Select value={headingValue} onValueChange={handleHeadingChange}>
          <SelectTrigger className="w-[180px] h-8">
            <Type className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Paragraph">
              <span className="truncate">
                {getHeadingDisplayText(headingValue)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">
              <div className="flex items-center justify-between w-full">
                <span>Paragraph</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+0
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h1">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xl">Heading 1</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+1
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h2">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-lg">Heading 2</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+2
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h3">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-base">Heading 3</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+3
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h4">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm">Heading 4</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+4
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h5">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs">Heading 5</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+5
                </kbd>
              </div>
            </SelectItem>
            <SelectItem value="h6">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs">Heading 6</span>
                <kbd className="ml-4 text-xs bg-muted px-1.5 py-0.5 rounded">
                  Ctrl+Alt+6
                </kbd>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          tooltip="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          tooltip="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          tooltip="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          tooltip="Code"
        >
          <Code className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          tooltip="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          tooltip="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          tooltip="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </MenuButton>

        <MenuButton onClick={addImage} tooltip="Image">
          <ImageIcon className="h-4 w-4" />
        </MenuButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          tooltip="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          tooltip="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          tooltip="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </MenuButton>

        <div className="ml-auto flex items-center">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo"
          >
            <Undo className="h-4 w-4" />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo"
          >
            <Redo className="h-4 w-4" />
          </MenuButton>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 focus:outline-none"
        onClick={() => editor?.chain().focus().run()}
        style={{ outline: "none" }}
      />

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center rounded-md border bg-background shadow-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 rounded-none"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive("bold")}
            >
              <Bold className="h-4 w-4" />
              <span className="sr-only">Bold</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 rounded-none"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive("italic")}
            >
              <Italic className="h-4 w-4" />
              <span className="sr-only">Italic</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 rounded-none"
              onClick={setLink}
              data-active={editor.isActive("link")}
            >
              <LinkIcon className="h-4 w-4" />
              <span className="sr-only">Link</span>
            </Button>
          </div>
        </BubbleMenu>
      )}
    </div>
  );
}
