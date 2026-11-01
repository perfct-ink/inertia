// Tripwire: fails loudly the moment schema.ts's node/mark set drifts from
// DocumentPage.tsx's actual Tiptap extensions array, since nothing enforces
// that at compile time (the two lists live in separate npm packages/Docker
// build contexts — see schema.ts's header comment for why).
import { describe, expect, it } from "vitest";
import { schema } from "../src/schema.js";

describe("schema", () => {
  it("has exactly the node types DocumentPage.tsx's editor extensions produce", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual([
      "bulletList", "codeBlock", "doc", "hardBreak", "heading", "horizontalRule",
      "image", "listItem", "orderedList", "paragraph", "table", "tableCell",
      "tableHeader", "tableRow", "text", "video", "workspaceTaskItem", "workspaceTaskList",
    ]);
  });

  it("has exactly the mark types DocumentPage.tsx's editor extensions produce", () => {
    expect(Object.keys(schema.marks).sort()).toEqual([
      "bold", "code", "italic", "link", "strike", "underline",
    ]);
  });

  it("keeps the stable id on headings, which heading links point at", () => {
    const withId = schema.nodeFromJSON({ type: "heading", attrs: { level: 2, id: "launch-plan" } });
    expect(withId.attrs).toEqual({ level: 2, id: "launch-plan" });
    expect(schema.nodeFromJSON({ type: "heading", attrs: { level: 2 } }).attrs.id).toBeNull();
  });
});
