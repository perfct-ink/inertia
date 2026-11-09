require "test_helper"

class DocumentMarkdownTest < ActiveSupport::TestCase
  def text(string, *marks)
    node = { "type" => "text", "text" => string }
    node["marks"] = marks.map { |m| m.is_a?(Hash) ? m : { "type" => m } } unless marks.empty?
    node
  end

  def paragraph(*children, style: nil)
    node = { "type" => "paragraph", "content" => children }
    node["attrs"] = { "style" => style } if style
    node
  end

  def heading(string, level: 1, id: nil)
    { "type" => "heading", "attrs" => { "level" => level, "id" => id }.compact, "content" => [ text(string) ] }
  end

  def doc(*blocks)
    { "type" => "doc", "content" => blocks }
  end

  def round_trip(content, **options)
    DocumentMarkdown.parse(DocumentMarkdown.render(content), title: "T", original: content, **options)
  end

  test "renders headings, formatting, links and lists" do
    content = doc(
      heading("Plan"),
      paragraph(text("Ship "), text("it", "bold"), text(" now, "), text("really", "italic"), text(" see "), text("docs", { "type" => "link", "attrs" => { "href" => "https://x.test" } })),
      { "type" => "bulletList", "content" => [
        { "type" => "listItem", "content" => [ paragraph(text("one")), { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ paragraph(text("nested")) ] } ] } ] },
        { "type" => "listItem", "content" => [ paragraph(text("two")) ] }
      ] },
      { "type" => "orderedList", "content" => [ { "type" => "listItem", "content" => [ paragraph(text("first")) ] } ] }
    )
    assert_equal "# Plan\n\nShip **it** now, *really* see [docs](https://x.test)\n\n- one\n  - nested\n- two\n\n1. first\n", DocumentMarkdown.render(content)
  end

  test "task lines keep their id and show their state" do
    content = doc(heading("T"), { "type" => "workspaceTaskList", "content" => [
      { "type" => "workspaceTaskItem", "attrs" => { "taskId" => 7 }, "content" => [ paragraph(text("Write spec")) ] },
      { "type" => "workspaceTaskItem", "attrs" => { "taskId" => 8 }, "content" => [ paragraph(text("Ship")) ] }
    ] })
    markdown = DocumentMarkdown.render(content, tasks: { 7 => "done", 8 => "todo" })
    assert_includes markdown, "- [x] Write spec <!-- task:7 -->"
    assert_includes markdown, "- [ ] Ship <!-- task:8 -->"

    items = DocumentMarkdown.parse(markdown, title: "T")["content"].last["content"]
    assert_equal [ 7, 8 ], items.map { |i| i.dig("attrs", "taskId") }
    assert_equal [ true, false ], items.map { |i| i.dig("attrs", "checked") }
    assert_equal "Write spec", items.first.dig("content", 0, "content", 0, "text")
  end

  test "a new task line has no id yet" do
    item = DocumentMarkdown.parse("# T\n\n- [ ] Brand new\n", title: "T")["content"].last["content"].first
    assert_nil item.dig("attrs", "taskId")
    assert_equal "workspaceTaskItem", item["type"]
  end

  test "headings keep their anchor id, and a repeated id is dropped" do
    content = doc(heading("Plan", id: "k3f9"), heading("Goals", level: 2, id: "ab12"))
    assert_includes DocumentMarkdown.render(content), "## Goals <!-- id:ab12 -->"
    again = round_trip(content)["content"]
    assert_equal [ "k3f9", "ab12" ], again.map { |h| h.dig("attrs", "id") }
    assert_equal [ 1, 2 ], again.map { |h| h.dig("attrs", "level") }

    duplicated = DocumentMarkdown.parse("# A <!-- id:same -->\n\n## B <!-- id:same -->\n", title: "T")["content"]
    assert_equal [ "same", nil ], duplicated.map { |h| h.dig("attrs", "id") }
  end

  test "paragraph styles survive, and body stays plain" do
    content = doc(heading("T"), paragraph(text("Pull quote"), style: "quote"), paragraph(text("Plain"), style: "body"))
    markdown = DocumentMarkdown.render(content)
    assert_includes markdown, "Pull quote <!-- style:quote -->"
    assert_not_includes markdown, "style:body"
    blocks = DocumentMarkdown.parse(markdown, title: "T")["content"]
    assert_equal "quote", blocks[1].dig("attrs", "style")
    assert_nil blocks[2]["attrs"]
  end

  test "blocks Markdown cannot hold come back untouched, tables stay readable" do
    table = { "type" => "table", "content" => [ { "type" => "tableRow", "content" => [ { "type" => "tableCell", "content" => [ paragraph(text("a")) ] }, { "type" => "tableCell", "content" => [ paragraph(text("b")) ] } ] } ] }
    audio = { "type" => "audio", "attrs" => { "src" => "/f/x.mp3", "name" => "x.mp3", "size" => 10, "type" => "audio/mpeg" } }
    content = doc(heading("T"), paragraph(text("before")), table, audio, paragraph(text("after")))
    markdown = DocumentMarkdown.render(content)
    assert_includes markdown, "<!-- keep:2 table\n| a | b |"
    assert_includes markdown, "<!-- keep:3 audio\n[x.mp3](/f/x.mp3)\n-->"

    edited = markdown.sub("before", "changed")
    result = DocumentMarkdown.parse(edited, title: "T", original: content)["content"]
    assert_equal %w[heading paragraph table audio paragraph], result.map { |b| b["type"] }
    assert_equal table, result[2]
    assert_equal audio, result[3]
    assert_equal "changed", result[1].dig("content", 0, "text")
  end

  test "deleting a keep comment deletes the block, and a keep comment cannot copy a normal block or be used twice" do
    table = { "type" => "table", "content" => [] }
    content = doc(heading("T"), paragraph(text("p")), table)
    without = DocumentMarkdown.parse("# T\n\np\n", title: "T", original: content)["content"]
    assert_equal %w[heading paragraph], without.map { |b| b["type"] }

    tricks = DocumentMarkdown.parse("# T\n\n<!-- keep:1 paragraph -->\n\n<!-- keep:2 table -->\n\n<!-- keep:2 table -->\n\n<!-- keep:9 table -->\n", title: "T", original: content)["content"]
    assert_equal %w[heading table], tricks.map { |b| b["type"] }
    wrong_type = DocumentMarkdown.parse("# T\n\n<!-- keep:2 video -->\n", title: "T", original: content)["content"]
    assert_equal %w[heading], wrong_type.map { |b| b["type"] }
  end

  test "special characters in text survive a round trip" do
    content = doc(heading("T"), paragraph(text("2 * 3 * 4 and snake_case and _lead and a [b] <i> `c` ~~d~~ \\ end")), paragraph(text("# not a heading")), paragraph(text("1. not a list")), paragraph(text("- not a bullet")))
    again = round_trip(content)["content"]
    assert_equal content["content"].drop(1).map { |b| b["content"].map { |n| n["text"] }.join }, again.drop(1).map { |b| b["content"].map { |n| n["text"] }.join }
    assert_equal %w[paragraph paragraph paragraph paragraph], again.drop(1).map { |b| b["type"] }
  end

  test "bold text with edge spaces and code with marks render sanely" do
    markdown = DocumentMarkdown.render(doc(heading("T"), paragraph(text("a "), text(" b ", "bold"), text("x", "bold", "code"))))
    assert_includes markdown, "a  **b** **`x`**"
  end

  test "hard breaks and soft wraps in a paragraph" do
    parsed = DocumentMarkdown.parse("# T\n\nline one  \nline two\nstill two\n", title: "T")["content"].last["content"]
    assert_equal [ "line one", nil, "line two still two" ], parsed.map { |n| n["text"] }
    assert_equal "hardBreak", parsed[1]["type"]
  end

  test "marks, code blocks, rules and images parse" do
    nodes = DocumentMarkdown.parse("# T\n\n**b** *i* ~~s~~ <u>u</u> `c`\n\n```ruby\nputs 1\n```\n\n---\n\n![alt](/img.png)\n", title: "T")["content"]
    marks = nodes[1]["content"].reject { |n| n["text"] == " " }.map { |n| n.dig("marks", 0, "type") }
    assert_equal %w[bold italic strike underline code], marks
    assert_equal({ "language" => "ruby" }, nodes[2]["attrs"])
    assert_equal "horizontalRule", nodes[3]["type"]
    assert_equal({ "src" => "/img.png", "alt" => "alt" }, nodes[4]["attrs"])
  end

  test "an image inside a paragraph splits it, since images are blocks" do
    nodes = DocumentMarkdown.parse("# T\n\nbefore ![a](/a.png) after\n", title: "T")["content"]
    assert_equal %w[heading paragraph image paragraph], nodes.map { |n| n["type"] }
  end

  test "a document must start with a heading, so the title is added when it is missing" do
    nodes = DocumentMarkdown.parse("Just text\n", title: "My doc")["content"]
    assert_equal "heading", nodes.first["type"]
    assert_equal "My doc", nodes.first.dig("content", 0, "text")
  end

  test "heading levels are clamped to the editor's five" do
    assert_equal 5, DocumentMarkdown.parse("# T\n\n###### deep\n", title: "T")["content"].last.dig("attrs", "level")
  end

  test "unsupported names what a Markdown rewrite would lose" do
    assert_empty DocumentMarkdown.unsupported(doc(heading("T"), { "type" => "table", "content" => [] }, { "type" => "video", "attrs" => {} }))
    assert_includes DocumentMarkdown.unsupported(doc(heading("T"), paragraph(text("x", "highlight")))), "highlight formatting"
    assert_includes DocumentMarkdown.unsupported(doc(heading("T"), paragraph({ "type" => "mention" }))), "mention"
    nested = { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ paragraph(text("a")), { "type" => "codeBlock" } ] } ] }
    assert_includes DocumentMarkdown.unsupported(doc(heading("T"), nested)), "codeBlock"
    assert_includes DocumentMarkdown.unsupported(doc(heading("T"), { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ paragraph(text("a"), { "type" => "hardBreak" }, text("b")) ] } ] })), "line breaks inside a list"
  end
end
