require "test_helper"

class SavedViewTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-views@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-views@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "ada-views@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @pat)
    @workspace.memberships.create!(user: @sam, role: :member)
    @workspace.memberships.create!(user: @ada, role: :admin)
  end

  def view(user, name, shared: false)
    @workspace.saved_views.create!(user: user, page: "task_table", name: name, config: { "sortKey" => "title" }, shared: shared)
  end

  def access(user)
    WorkspaceAccess.for(user).fetch(@workspace.id)
  end

  test "a person sees their own views and shared ones, not other people's private ones" do
    mine = view(@pat, "Mine")
    shared = view(@sam, "Team", shared: true)
    view(@sam, "Sam private")
    assert_equal [ mine, shared ].sort_by(&:id), @workspace.saved_views.visible_to(@pat).sort_by(&:id)
  end

  test "name, page and an object config are required" do
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "", config: {}).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "x" * 81, config: {}).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "nope", name: "x", config: {}).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "x", config: []).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "x", config: nil).valid?
    assert @workspace.saved_views.build(user: @pat, page: "task_table", name: "x", config: { "a" => 1 }).valid?
  end

  test "every page that keeps views is accepted" do
    assert_equal %w[calendar gantt pivot task_table tasks], SavedView::PAGES.sort
    SavedView::PAGES.each do |page|
      assert @workspace.saved_views.build(user: @pat, page: page, name: page, config: {}).valid?, page
    end
  end

  test "a huge config is refused" do
    big = { "query" => "x" * SavedView::MAX_CONFIG_BYTES }
    saved = @workspace.saved_views.build(user: @pat, page: "task_table", name: "Big", config: big)
    assert_not saved.valid?
    assert_includes saved.errors[:config], "is too large"
  end

  test "the page cannot change after the view is made" do
    saved = view(@pat, "Mine")
    assert_not saved.update(page: "pivot")
    assert_includes saved.errors[:page], "cannot be changed"
  end

  test "the owner changes their own views; an admin changes only shared ones; nobody else changes any" do
    private_view = view(@sam, "Private")
    shared_view = view(@sam, "Shared", shared: true)

    assert private_view.changeable_by?(@sam, access(@sam))
    assert shared_view.changeable_by?(@sam, access(@sam))
    assert_not private_view.changeable_by?(@ada, access(@ada))
    assert shared_view.changeable_by?(@ada, access(@ada))
    assert shared_view.changeable_by?(@pat, access(@pat))
    other_member = User.create!(name: "Mo", email: "mo-views@example.com", password: "password123")
    @workspace.memberships.create!(user: other_member, role: :member)
    assert_not shared_view.changeable_by?(other_member, access(other_member))
  end

  test "a viewer changes their own views, shared or private, but not other people's" do
    viewer = User.create!(name: "Vi", email: "vi-views@example.com", password: "password123")
    @workspace.memberships.create!(user: viewer, role: :viewer)
    own_private = view(viewer, "Own private")
    own_shared = view(viewer, "Own shared", shared: true)
    sam_shared = view(@sam, "Sam shared", shared: true)

    assert own_private.changeable_by?(viewer, access(viewer))
    assert own_shared.changeable_by?(viewer, access(viewer))
    assert_not sam_shared.changeable_by?(viewer, access(viewer))
    assert own_shared.changeable_by?(@ada, access(@ada))
  end

  test "deleting a user removes their views" do
    view(@sam, "Sam private")
    view(@sam, "Sam shared", shared: true)
    @workspace.memberships.find_by(user: @sam).destroy
    assert_difference -> { SavedView.count }, -2 do
      @sam.destroy
    end
  end

  test "deleting a space removes its views" do
    view(@pat, "Mine")
    assert_difference -> { SavedView.count }, -1 do
      @workspace.destroy
    end
  end
end
