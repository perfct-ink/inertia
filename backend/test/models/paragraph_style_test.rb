require "test_helper"

class ParagraphStyleTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-styles@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-styles@example.com", password: "password123")
  end

  def build(attrs = {})
    @pat.paragraph_styles.build({ name: "Callout", base: "quote" }.merge(attrs))
  end

  test "a style has a name and a built-in base, and keeps its formatting" do
    style = build(properties: { "size" => 20, "color" => "#2563eb", "weight" => 700, "font" => "serif", "spacing" => 1.5, "align" => "center" })
    assert style.save
    assert_equal "quote", style.reload.base
    assert_equal({ "size" => 20, "color" => "#2563eb", "weight" => 700, "font" => "serif", "spacing" => 1.5, "align" => "center" }, style.properties)
  end

  test "formatting is optional and blank values are dropped" do
    style = build(properties: { size: "", color: nil, align: "right" })
    assert style.save
    assert_equal({ "align" => "right" }, style.reload.properties)
    assert_equal({}, build(name: "Plain").tap(&:save!).properties)
  end

  test "the name is required, squished and at most 40 characters" do
    assert_not build(name: "").valid?
    assert_not build(name: "x" * 41).valid?
    assert_equal "My callout", build(name: "  My   callout ").tap(&:save!).name
  end

  test "names are unique per person, ignoring case, but another person can reuse them" do
    build.save!
    assert_not build(name: "callout").valid?
    assert @sam.paragraph_styles.build(name: "Callout", base: "body").valid?
  end

  test "a style cannot take the name of a built-in style" do
    assert_not build(name: "quote").valid?
    assert_not build(name: "Heading 1").valid?
  end

  test "the base must be a built-in paragraph style" do
    %w[body title subtitle quote caption monospace].each { |base| assert build(name: "On #{base}", base: base).valid?, base }
    assert_not build(base: "heading1").valid?
    assert_not build(base: "custom-3").valid?
  end

  test "formatting values outside the allowed set are rejected" do
    [ { size: 7 }, { size: 97 }, { size: 12.5 }, { size: "12" }, { weight: 800 }, { font: "comic" },
      { color: "red" }, { color: "#12345" }, { color: "url(x)" }, { spacing: 0.5 }, { spacing: 3.5 },
      { align: "start" }, { shadow: "1px" } ].each do |properties|
      style = build(properties: properties)
      assert_not style.valid?, "#{properties} should be rejected"
    end
    assert_not build(properties: "bold").valid?
  end

  test "a person can have at most 50 styles" do
    ParagraphStyle::MAX_PER_USER.times { |i| @pat.paragraph_styles.create!(name: "Style #{i}", base: "body") }
    style = build(name: "One too many")
    assert_not style.valid?
    assert_includes style.errors.full_messages, "You can have at most 50 custom styles"
  end

  test "deleting the person deletes their styles" do
    build.save!
    assert_difference -> { ParagraphStyle.count }, -1 do
      @pat.destroy!
    end
  end

  test "the styles a document refers to are found in its paragraphs, once each, lowest first" do
    doc = {
      "type" => "doc",
      "content" => [
        { "type" => "heading", "attrs" => { "level" => 1, "style" => "custom-4" } },
        { "type" => "paragraph", "attrs" => { "style" => "custom-9" } },
        { "type" => "paragraph", "attrs" => { "style" => "quote" } },
        { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ { "type" => "paragraph", "attrs" => { "style" => "custom-3" } } ] } ] },
        { "type" => "paragraph", "attrs" => { "style" => "custom-9" } },
        { "type" => "paragraph", "attrs" => { "style" => "custom-x" } },
        { "type" => "paragraph" }
      ]
    }
    assert_equal [ 3, 9 ], ParagraphStyle.referenced_ids(doc)
  end

  test "a document with nothing to read refers to no styles" do
    assert_equal [], ParagraphStyle.referenced_ids({})
    assert_equal [], ParagraphStyle.referenced_ids(nil)
    assert_equal [], ParagraphStyle.referenced_ids({ "type" => "paragraph", "attrs" => "oops" })
  end
end
