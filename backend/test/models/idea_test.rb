require "test_helper"

class IdeaTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-idea@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "promoting to an initiative keeps the description and records what it became" do
    idea = @workspace.ideas.create!(title: "Dark mode", description: "Users ask for it", submitted_by: @user)
    initiative = idea.promote!("initiative")
    assert_equal "Dark mode", initiative.title
    assert_equal "Users ask for it", initiative.description
    assert_equal @workspace, initiative.workspace
    assert idea.reload.status_promoted?
    assert_equal initiative, idea.promoted_record
  end

  test "promoting to an epic creates an epic with the title" do
    epic = @workspace.ideas.create!(title: "Offline mode").promote!("epic")
    assert_kind_of Epic, epic
    assert_equal "Offline mode", epic.title
  end

  test "an idea is promoted once, and only to an epic or initiative" do
    idea = @workspace.ideas.create!(title: "X")
    assert_raises(ArgumentError) { idea.promote!("milestone") }
    idea.promote!("epic")
    assert_raises(ArgumentError) { idea.promote!("initiative") }
    assert_equal 1, @workspace.epics.count
    assert_equal 0, @workspace.initiatives.count
  end

  test "a title is required" do
    assert_not @workspace.ideas.build(title: "").valid?
  end
end
