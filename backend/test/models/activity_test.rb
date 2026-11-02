require "test_helper"

class ActivityTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-activity@example.com", password: "password123")
    @workspace = @user.workspace
    Current.user = @user
  end

  test "creating an item logs who created it" do
    task = @workspace.tasks.create!(title: "Ship")

    entry = task.activities.sole
    assert entry.created?
    assert_equal @user, entry.actor
    assert_equal @workspace.id, entry.workspace_id
    assert_equal({}, entry.field_changes)
  end

  test "work with no signed-in user is logged without an actor" do
    Current.user = nil
    task = @workspace.tasks.create!(title: "Imported")

    assert_nil task.activities.sole.actor
  end

  test "an edit logs each audited field that changed, naming associations" do
    epic = @workspace.epics.create!(title: "Launch")
    task = @workspace.tasks.create!(title: "Ship", status: :todo)

    task.update!(title: "Ship it", status: :done, assignee: @user, epic: epic, due_date: Date.new(2026, 11, 5), position: 3)

    entry = task.activities.updated.sole.reload
    assert_equal @user, entry.actor
    assert_equal(
      { "title" => [ "Ship", "Ship it" ], "status" => [ "todo", "done" ], "assignee" => [ nil, "Pat" ], "epic" => [ nil, "Launch" ], "due_date" => [ nil, "2026-11-05" ] },
      entry.field_changes
    )
  end

  test "enum and number fields log their values" do
    task = @workspace.tasks.create!(title: "Ship")

    task.update!(priority: :urgent, story_points: 5)

    assert_equal({ "priority" => [ "none", "urgent" ], "story_points" => [ nil, 5 ] }, task.activities.updated.sole.reload.field_changes)
  end

  test "clearing an association logs the name it had" do
    epic = @workspace.epics.create!(title: "Launch")
    task = @workspace.tasks.create!(title: "Ship", epic: epic)

    task.update!(epic: nil)

    assert_equal({ "epic" => [ "Launch", nil ] }, task.activities.updated.sole.reload.field_changes)
  end

  test "an edit to a field that is not audited logs nothing" do
    task = @workspace.tasks.create!(title: "Ship")

    task.update!(position: 5)
    task.update!(title: "Ship")

    assert_equal 1, task.activities.count
  end

  test "long text is shortened and valueless fields log only that they changed" do
    task = @workspace.tasks.create!(title: "Ship")

    task.update!(title: "t" * 500, description: "d" * 500)

    changes = task.activities.updated.sole.reload.field_changes
    assert_equal [ "Ship", "t" * 197 + "..." ], changes["title"]
    assert_nil changes["description"]
    assert_includes changes.keys, "description"
  end

  test "a document logs a move between folders and the workspace comes from its folder" do
    docs = @workspace.folders.create!(name: "Docs")
    plans = @workspace.folders.create!(name: "Plans")
    document = docs.documents.create!(title: "Plan", created_by: @user)

    document.update!(folder: plans)

    assert_equal [ @workspace.id ], document.activities.pluck(:workspace_id).uniq
    assert_equal({ "folder" => [ "Docs", "Plans" ] }, document.activities.updated.sole.reload.field_changes)
  end

  test "a burst of content edits by one person is one entry whose time moves forward" do
    document = @workspace.folders.create!(name: "Docs").documents.create!(title: "Plan", created_by: @user)
    document.update!(content: { "type" => "doc", "n" => 1 })
    first_time = document.activities.updated.sole.created_at

    travel 5.minutes do
      document.update!(content: { "type" => "doc", "n" => 2 })
    end

    entry = document.activities.updated.sole
    assert_equal({ "content" => nil }, entry.field_changes)
    assert_operator entry.created_at, :>, first_time
  end

  test "content edits start a new entry after a pause, from someone else, or alongside another change" do
    document = @workspace.folders.create!(name: "Docs").documents.create!(title: "Plan", created_by: @user)
    document.update!(content: { "n" => 1 })

    travel 11.minutes do
      document.update!(content: { "n" => 2 })
    end
    assert_equal 2, document.activities.updated.count

    Current.user = User.create!(name: "Ada", email: "ada-activity@example.com", password: "password123")
    document.update!(content: { "n" => 3 })
    assert_equal 3, document.activities.updated.count

    document.update!(content: { "n" => 4 }, title: "Plan B")
    assert_equal 4, document.activities.updated.count
  end

  test "deleting an item removes its log" do
    task = @workspace.tasks.create!(title: "Ship")
    task.update!(status: :done)

    assert_difference "Activity.count", -2 do
      task.destroy
    end
  end

  test "deleting the person who made a change keeps the entry without a name" do
    team = Workspace.create!(name: "Team", user: @user)
    ada = User.create!(name: "Ada", email: "ada-gone-activity@example.com", password: "password123")
    team.memberships.create!(user: ada, role: :member)
    Current.user = ada
    task = team.tasks.create!(title: "Ship")

    ada.destroy!

    assert_nil task.activities.sole.actor
  end

  test "every model that is audited is a valid subject type" do
    Rails.application.eager_load!
    audited = ApplicationRecord.descendants.select { |model| model.include?(Auditable) }.map(&:name)

    assert_equal audited.sort, Activity::SUBJECT_TYPES.sort
  end
end
