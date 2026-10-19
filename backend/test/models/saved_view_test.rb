require "test_helper"

class SavedViewTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-views@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-views@example.com", password: "password123")
    @workspace = @pat.workspace
    @workspace.memberships.create!(user: @sam, role: :member)
  end

  def view(user, name, shared: false)
    @workspace.saved_views.create!(user: user, page: "task_table", name: name, config: { "sortKey" => "title" }, shared: shared)
  end

  test "a person sees their own views and shared ones, not other people's private ones" do
    mine = view(@pat, "Mine")
    shared = view(@sam, "Team", shared: true)
    view(@sam, "Sam private")
    assert_equal [ mine, shared ].sort_by(&:id), @workspace.saved_views.visible_to(@pat).sort_by(&:id)
  end

  test "name, page and an object config are required" do
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "", config: {}).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "nope", name: "x", config: {}).valid?
    assert_not @workspace.saved_views.build(user: @pat, page: "task_table", name: "x", config: []).valid?
    assert @workspace.saved_views.build(user: @pat, page: "task_table", name: "x", config: { "a" => 1 }).valid?
  end
end
