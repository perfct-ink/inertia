require "test_helper"

class DocumentMarkdownTest < ActiveSupport::TestCase
  def text(value, marks = nil) = { "type" => "text", "text" => value }.tap { |n| n["marks"] = marks if marks }
  def paragraph(*nodes) = { "type" => "paragraph", "content" => nodes }
  def heading(level, value) = { "type" => "heading", "attrs" => { "level" => level }, "content" => [ text(value) ] }
  def task(id, value) = { "type" => "workspaceTaskItem", "attrs" => { "taskId" => id }, "content" => [ paragraph(text(value)) ] }
  def list_item(value, *nested) = { "type" => "listItem", "content" => [ paragraph(text(value)), *nested ] }

  test "renders headings, marks, links and ticked or unticked task lines with their ids" do
    doc = { "type" => "doc", "content" => [
      heading(1, "Launch plan"),
      paragraph(text("Ship "), text("soon", [ { "type" => "bold" } ]), text(" with "), text("docs", [ { "type" => "link", "attrs" => { "href" => "https://x.test" } } ])),
      { "type" => "workspaceTaskList", "content" => [ task(12, "Write spec"), task(13, "Review"), task(nil, "New one") ] }
    ] }
    md = DocumentMarkdown.render(doc, tasks: { 12 => "done", 13 => "todo" })
    assert_includes md, "# Launch plan"
    assert_includes md, "Ship **soon** with [docs](https://x.test)"
    assert_includes md, "- [x] Write spec <!-- task:12 -->"
    assert_includes md, "- [ ] Review <!-- task:13 -->"
    assert_includes md, "- [ ] New one\n"
  end

  test "nested bullet lists are indented" do
    doc = { "type" => "doc", "content" => [ { "type" => "bulletList", "content" => [
      list_item("one", { "type" => "bulletList", "content" => [ list_item("nested") ] }), list_item("two")
    ] } ] }
    assert_includes DocumentMarkdown.render(doc), "- one\n  - nested\n- two"
  end

  test "parsing gives back the same document, keeping task ids" do
    doc = { "type" => "doc", "content" => [
      heading(1, "Plan"), paragraph(text("Intro "), text("bold", [ { "type" => "bold" } ])), heading(2, "Todo"),
      { "type" => "workspaceTaskList", "content" => [ task(5, "A"), task(nil, "B") ] },
      { "type" => "bulletList", "content" => [ list_item("one", { "type" => "bulletList", "content" => [ list_item("nested") ] }) ] },
      { "type" => "codeBlock", "attrs" => { "language" => "ruby" }, "content" => [ text("puts 1") ] },
      { "type" => "horizontalRule" }
    ] }
    back = DocumentMarkdown.parse(DocumentMarkdown.render(doc), title: "ignored")
    assert_equal doc["content"][0..2], back["content"][0..2]
    assert_equal [ 5, nil ], back["content"][3]["content"].map { |i| i.dig("attrs", "taskId") }
    assert_equal "nested", back["content"][4].dig("content", 0, "content", 1, "content", 0, "content", 0, "content", 0, "text")
    assert_equal doc["content"][5], back["content"][5]
    assert_equal "horizontalRule", back["content"][6]["type"]
  end

  test "Markdown without a leading heading gets one from the title, and inline marks parse" do
    back = DocumentMarkdown.parse("Some *italic*, `code`, ~~gone~~ and <u>under</u>.", title: "Notes")
    assert_equal heading(1, "Notes"), back["content"][0]
    marks = back["content"][1]["content"].map { |n| [ n["text"], (n["marks"] || []).map { |m| m["type"] } ] }
    assert_includes marks, [ "italic", [ "italic" ] ]
    assert_includes marks, [ "code", [ "code" ] ]
    assert_includes marks, [ "gone", [ "strike" ] ]
    assert_includes marks, [ "under", [ "underline" ] ]
  end

  test "an image inside a paragraph becomes a block of its own" do
    back = DocumentMarkdown.parse("# T\n\nBefore ![alt](http://i/x.png) after", title: "T")
    assert_equal %w[heading paragraph image paragraph], back["content"].map { |n| n["type"] }
  end

  test "tables and video cannot be round-tripped and are reported" do
    table = { "type" => "doc", "content" => [ { "type" => "table", "content" => [ { "type" => "tableRow", "content" => [ { "type" => "tableHeader", "content" => [ paragraph(text("A")) ] } ] } ] } ] }
    assert_equal [ "table" ], DocumentMarkdown.unsupported(table)
    assert_equal [ "video" ], DocumentMarkdown.unsupported({ "type" => "doc", "content" => [ { "type" => "video" } ] })
    assert_empty DocumentMarkdown.unsupported({ "type" => "doc", "content" => [ heading(1, "Plain") ] })
    assert_includes DocumentMarkdown.render(table), "| A |"
  end
end
