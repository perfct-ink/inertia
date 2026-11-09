require "test_helper"

# The saved-content side of heading links (docs/features/heading_links.md). The
# cases mirror frontend/src/data/heading.test.ts for `headingsOf`.
class DocumentHeadingsTest < ActiveSupport::TestCase
  def text(value)
    { "type" => "text", "text" => value }
  end

  def heading(*parts, level: 2, id: nil)
    attrs = { "level" => level }
    attrs["id"] = id unless id.nil?
    { "type" => "heading", "attrs" => attrs, "content" => parts }
  end

  def doc(*nodes)
    { "type" => "doc", "content" => nodes }
  end

  test "lists headings in order with their stored id, trimmed text and level" do
    content = doc(
      heading(text("Title"), level: 1),
      { "type" => "paragraph", "content" => [ text("Body") ] },
      heading(text("  Intro "), id: "intro"),
      heading(text("Scope"), level: 3)
    )

    assert_equal [
      { id: nil, text: "Title", level: 1 },
      { id: "intro", text: "Intro", level: 2 },
      { id: nil, text: "Scope", level: 3 }
    ], DocumentHeadings.of(content)
  end

  test "finds headings nested in lists and joins text across marks and line breaks" do
    content = doc(
      { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ heading(text("Deep")) ] } ] },
      heading(text("Launch "), { "type" => "hardBreak" }, text("plan"))
    )

    assert_equal [ "Deep", "Launch  plan" ], DocumentHeadings.of(content).map { |h| h[:text] }
  end

  test "an empty or missing id is nil and a missing level is 1" do
    content = doc({ "type" => "heading", "attrs" => { "id" => "" }, "content" => [ text("Plain") ] })

    assert_equal [ { id: nil, text: "Plain", level: 1 } ], DocumentHeadings.of(content)
  end

  test "content that is not editor JSON has no headings" do
    [ nil, {}, [], "text", { "type" => "doc" }, { "type" => "doc", "content" => "x" } ].each do |content|
      assert_equal [], DocumentHeadings.of(content)
    end
  end

  test "a text document lists its headings and other kinds list none" do
    document = Document.new(doc_type: "document", content: doc(heading(text("A"))))
    sheet = Document.new(doc_type: "spreadsheet", content: doc(heading(text("A"))))

    assert_equal [ "A" ], document.headings.map { |h| h[:text] }
    assert_equal [], sheet.headings
  end
end
