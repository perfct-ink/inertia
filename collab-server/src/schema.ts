// Schema-only mirror of frontend/src/pages/workspace/DocumentPage.tsx's editor
// `extensions` array, plus frontend/src/extensions/{WorkspaceTaskList,
// WorkspaceTaskItem,Video,Attachment,TaskEmbed}. y-prosemirror's JSON<->Yjs conversion only cares
// about node/mark SHAPE (name, group, content, attrs) — NodeView renderers,
// parseHTML/renderHTML, keyboard shortcuts, and toolbar commands are UI
// concerns and are deliberately omitted here. That's why this list is
// shorter than the frontend's: standard nodes are the exact same versioned
// @tiptap/extension-* packages in both places (can't drift), so only the
// app-specific custom nodes need hand-copying.
//
// KEEP IN SYNC with DocumentPage.tsx's extensions array whenever a node/mark
// is added, removed, or gets a new attribute — schema.test.ts asserts the
// resulting node/mark name set as a tripwire against silent drift.
import { getSchema, Node } from "@tiptap/core";
import TiptapDocument from "@tiptap/extension-document";
import TiptapParagraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import BaseHeading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import CodeBlock from "@tiptap/extension-code-block";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

// Matches DocumentPage.tsx:66 — document always starts with a heading
// followed by body content.
const CustomDocument = TiptapDocument.extend({ content: "heading block*" });

// Matches frontend/src/extensions/HeadingAnchor.ts (shape only): every heading
// can carry a stable `id`, which heading links use as their anchor. Without the
// attribute here, seeding a document from Rails' JSON would drop the ids.
const Heading = BaseHeading.extend({
  addAttributes() {
    return { ...this.parent?.(), id: { default: null } };
  },
});

// Matches frontend/src/extensions/StyledParagraph.ts exactly (shape only): a
// paragraph with a named style.
const Paragraph = TiptapParagraph.extend({
  addAttributes() {
    return { style: { default: "body" } };
  },
});

// Matches frontend/src/extensions/WorkspaceTaskList.ts exactly (shape only).
const WorkspaceTaskList = Node.create({
  name: "workspaceTaskList",
  group: "block",
  content: "workspaceTaskItem+",
});

// Matches frontend/src/extensions/WorkspaceTaskItem.tsx exactly (shape only).
const WorkspaceTaskItem = Node.create({
  name: "workspaceTaskItem",
  content: "paragraph",
  defining: true,
  addAttributes() {
    return { taskId: { default: null } };
  },
});

// Matches frontend/src/extensions/Video.ts exactly (shape only).
const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
});

// Matches frontend/src/extensions/Attachment.ts exactly (shape only): an audio
// player and a file card share these four attributes.
const attachmentAttributes = {
  src: { default: null },
  name: { default: null },
  size: { default: null },
  type: { default: null },
};

const AudioAttachment = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  addAttributes() {
    return attachmentAttributes;
  },
});

const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  addAttributes() {
    return attachmentAttributes;
  },
});

// Matches frontend/src/extensions/TaskEmbed.ts exactly (shape only): a live task
// list or Gantt that stores what to show and reads the tasks when drawn. The
// defaults are TASK_EMBED_DEFAULTS in frontend/src/data/taskEmbed.ts.
const TaskEmbed = Node.create({
  name: "taskEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      view: { default: "list" },
      scope: { default: "space" },
      scopeId: { default: null },
      status: { default: "open" },
    };
  },
});

export const schemaExtensions = [
  CustomDocument, Paragraph, Text, HardBreak,
  Bold, Italic, Underline, Strike, Code,
  Heading, BulletList, OrderedList, ListItem,
  WorkspaceTaskList, WorkspaceTaskItem, TaskEmbed,
  CodeBlock, HorizontalRule, Image, Link, Video, AudioAttachment, FileAttachment,
  Table, TableRow, TableCell, TableHeader,
];

export const schema = getSchema(schemaExtensions);
