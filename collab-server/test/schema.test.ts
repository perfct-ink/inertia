// Tripwire: fails loudly the moment schema.ts's node/mark set drifts from
// DocumentPage.tsx's actual Tiptap extensions array, since nothing enforces
// that at compile time (the two lists live in separate npm packages/Docker
// build contexts — see schema.ts's header comment for why).
import { describe, expect, it } from "vitest";
import { schema } from "../src/schema.js";

describe("schema", () => {
  it("has exactly the node types DocumentPage.tsx's editor extensions produce", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual([
      "audio", "bulletList", "codeBlock", "doc", "fileAttachment", "hardBreak", "heading",
      "horizontalRule", "image", "listItem", "orderedList", "paragraph", "table", "tableCell",
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

  it("keeps a paragraph's style, and for a custom style its name and formatting copy", () => {
    const props = '{"owner":3,"base":"quote","size":20}';
    const custom = schema.nodeFromJSON({ type: "paragraph", attrs: { style: "custom-7", styleName: "Callout", styleProps: props } });
    expect(custom.attrs).toEqual({ style: "custom-7", styleName: "Callout", styleProps: props });
    expect(schema.nodeFromJSON({ type: "paragraph", attrs: { style: "quote" } }).attrs).toEqual({ style: "quote", styleName: null, styleProps: null });
    expect(schema.nodeFromJSON({ type: "paragraph" }).attrs).toEqual({ style: "body", styleName: null, styleProps: null });
  });

  it("keeps the style of a bullet list, and a list with none is a plain bullet list", () => {
    const item = { type: "listItem", content: [{ type: "paragraph" }] };
    const dashed = schema.nodeFromJSON({ type: "bulletList", attrs: { listStyle: "dashed" }, content: [item] });
    expect(dashed.attrs).toEqual({ listStyle: "dashed" });
    expect(schema.nodeFromJSON({ type: "bulletList", content: [item] }).attrs).toEqual({ listStyle: "bullet" });
  });
});
