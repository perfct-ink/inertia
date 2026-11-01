require "test_helper"

class TaskStatusSettingTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-status-setting@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Project")
  end

  test "labels are trimmed and a blank label or color is dropped" do
    setting = @workspace.task_status_settings.create!(status: :in_progress, label: "  Doing  ", color: " ")

    assert_equal "Doing", setting.label
    assert_nil setting.color
  end

  test "needs a label or a color" do
    setting = @workspace.task_status_settings.build(status: :done, label: " ")

    assert_not setting.valid?
    assert_includes setting.errors[:base], "Add a label or a color"
  end

  test "rejects an unknown status, an unknown color and a label that is too long" do
    assert_not @workspace.task_status_settings.build(status: "stuck", label: "Stuck").valid?
    assert_not @workspace.task_status_settings.build(status: :todo, color: "pink").valid?
    assert_not @workspace.task_status_settings.build(status: :todo, label: "x" * 41).valid?
    assert @workspace.task_status_settings.build(status: :todo, label: "x" * 40).valid?
  end

  test "one row per status for the Space default and for each folder" do
    @workspace.task_status_settings.create!(status: :todo, label: "Queued")
    @workspace.task_status_settings.create!(status: :todo, label: "Queued here", folder: @folder)

    assert_not @workspace.task_status_settings.build(status: :todo, label: "Again").valid?
    assert_not @workspace.task_status_settings.build(status: :todo, label: "Again", folder: @folder).valid?
    assert @workspace.task_status_settings.build(status: :done, label: "Shipped", folder: @folder).valid?
  end

  test "the same statuses as Task" do
    assert_equal Task.statuses.keys, TaskStatusSetting.statuses.keys
  end

  test "rejects a folder from another workspace" do
    other = User.create!(name: "Bob", email: "bob-status-setting@example.com", password: "password123")
    foreign = other.workspace.folders.create!(name: "Theirs")

    setting = @workspace.task_status_settings.build(status: :todo, label: "Queued", folder: foreign)
    assert_not setting.valid?
    assert_includes setting.errors[:folder], "must belong to the same workspace"
  end

  test "replace_for! swaps a board's settings and leaves the others alone" do
    @workspace.task_status_settings.create!(status: :todo, label: "Space todo")
    @workspace.task_status_settings.create!(status: :todo, label: "Old", folder: @folder)
    @workspace.task_status_settings.create!(status: :done, color: "purple", folder: @folder)

    TaskStatusSetting.replace_for!(@workspace, @folder, [
      { status: "in_progress", label: "Doing", color: "orange" },
      { status: "in_review", label: " ", color: nil }
    ])

    assert_equal [ [ "in_progress", "Doing", "orange" ] ], @workspace.task_status_settings.where(folder: @folder).pluck(:status, :label, :color)
    assert_equal [ "Space todo" ], @workspace.task_status_settings.where(folder: nil).pluck(:label)
  end

  test "replace_for! changes nothing when an entry is invalid" do
    @workspace.task_status_settings.create!(status: :todo, label: "Keep me", folder: @folder)

    assert_raises(ActiveRecord::RecordInvalid) do
      TaskStatusSetting.replace_for!(@workspace, @folder, [ { status: "done", label: "Shipped" }, { status: "todo", color: "pink" } ])
    end

    assert_equal [ "Keep me" ], @workspace.task_status_settings.where(folder: @folder).pluck(:label)
  end

  test "deleting a folder or a space removes its settings" do
    @workspace.task_status_settings.create!(status: :todo, label: "Queued", folder: @folder)
    @folder.destroy
    assert_equal 0, TaskStatusSetting.count

    team = Workspace.create!(name: "Team", user: @user)
    team.task_status_settings.create!(status: :todo, label: "Queued")
    team.task_status_settings.create!(status: :todo, label: "Queued", folder: team.folders.create!(name: "Sub"))
    team.destroy
    assert_equal 0, TaskStatusSetting.count
  end
end
