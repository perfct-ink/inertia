require "test_helper"

# Slug is pure: no records are created here.
class SlugTest < ActiveSupport::TestCase
  test "slugify makes lowercase hyphenated words" do
    assert_equal "feature-folders", Slug.slugify("Feature Folders")
    assert_equal "feature-folders", Slug.slugify("  Feature_Folders!! ")
    assert_equal "q4-2026-plan", Slug.slugify("Q4 / 2026 -- Plan")
  end

  test "slugify drops accents" do
    assert_equal "cafe-menu", Slug.slugify("Café Menu")
  end

  test "slugify falls back when nothing usable is left" do
    assert_equal "untitled", Slug.slugify("!!!")
    assert_equal "untitled", Slug.slugify("日本語")
    assert_equal "untitled", Slug.slugify(nil)
    assert_equal "page", Slug.slugify("", fallback: "page")
  end

  test "slugify cuts long names without a trailing hyphen" do
    slug = Slug.slugify("#{'a' * 59} bcd")
    assert_operator slug.length, :<=, Slug::MAX_LENGTH
    assert_no_match(/-\z/, slug)
    assert_match Slug::FORMAT, slug
  end

  test "unique keeps a free slug and numbers a taken one" do
    assert_equal "notes", Slug.unique("notes", [])
    assert_equal "notes-2", Slug.unique("notes", [ "notes" ])
    assert_equal "notes-3", Slug.unique("notes", [ "notes", "notes-2", nil ])
  end

  test "unique never returns a reserved slug" do
    assert_equal "tasks-2", Slug.unique("tasks", [], reserved: Slug::RESERVED)
    assert_equal "tasks", Slug.unique("tasks", [])
  end

  test "every top-level app route is reserved" do
    %w[login signup shared space documents folders tasks events epics initiatives milestones sprints roadmap okrs hierarchy projects api features pricing about].each do |segment|
      assert_includes Slug::RESERVED, segment
    end
  end

  test "reserved slugs are valid slugs, so they would otherwise be generated" do
    assert Slug::RESERVED.all? { |slug| Slug::FORMAT.match?(slug) }
  end

  test "split and join move between paths and segments" do
    assert_equal [ "acme", "product", "requirements" ], Slug.split("/Acme//product/requirements/")
    assert_equal [], Slug.split(nil)
    assert_equal "acme/product", Slug.join([ "acme", "product" ])
    assert_equal "/acme/product", Slug.path([ "acme", "product" ])
    assert_equal "/", Slug.path([])
  end
end
