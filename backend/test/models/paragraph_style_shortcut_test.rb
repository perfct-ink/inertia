require "test_helper"

class ParagraphStyleShortcutTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-keys@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-keys@example.com", password: "password123")
  end

  def build(attrs = {})
    @pat.paragraph_style_shortcuts.build({ style: "quote", keys: "Ctrl-Mod-1" }.merge(attrs))
  end

  test "a built-in style can have a keystroke" do
    assert build.save
  end

  test "one of the person's own styles can have a keystroke, someone else's cannot" do
    mine = @pat.paragraph_styles.create!(name: "Callout")
    theirs = @sam.paragraph_styles.create!(name: "Sidebar")
    assert build(style: "custom-#{mine.id}").valid?
    assert_not build(style: "custom-#{theirs.id}").valid?
    assert_not build(style: "custom-0").valid?
    assert_not build(style: "headline").valid?
  end

  test "a keystroke needs Mod and a letter or digit" do
    %w[Ctrl-Mod-1 Mod-Alt-7 Mod-Shift-m Ctrl-Mod-Alt-Shift-z].each { |keys| assert build(keys: keys).valid?, keys }
    %w[1 Alt-1 Ctrl-1 Mod Mod-Enter Mod-Alt-Ctrl-1 Mod-A mod-1 Mod-12].each { |keys| assert_not build(keys: keys).valid?, keys }
  end

  test "a style has one keystroke and a keystroke belongs to one style" do
    build.save!
    assert_not build(keys: "Ctrl-Mod-2").valid?
    assert_not build(style: "title").valid?
    assert @sam.paragraph_style_shortcuts.build(style: "quote", keys: "Ctrl-Mod-1").valid?
  end

  test "deleting a custom style deletes its keystroke" do
    style = @pat.paragraph_styles.create!(name: "Callout")
    build(style: "custom-#{style.id}").save!
    build(style: "title", keys: "Ctrl-Mod-2").save!
    style.destroy!
    assert_equal %w[title], @pat.paragraph_style_shortcuts.pluck(:style)
  end
end
