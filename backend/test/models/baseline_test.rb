require "test_helper"

class BaselineTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-baseline@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Plan")
    @sub = @workspace.folders.create!(name: "Sub", parent: @folder)
  end

  test "snapshot copies dated tasks in the folder, subfolders and their documents" do
    document = Document.create!(title: "Spec", folder: @sub, created_by: @user)
    direct = @workspace.tasks.create!(title: "A", folder: @folder, start_date: Date.new(2026, 11, 1), due_date: Date.new(2026, 11, 5))
    nested = @workspace.tasks.create!(title: "B", document: document, due_date: Date.new(2026, 11, 9))
    @workspace.tasks.create!(title: "Undated", folder: @folder)
    @workspace.tasks.create!(title: "Elsewhere", due_date: Date.new(2026, 11, 2))

    baseline = Baseline.snapshot!(folder: @folder, name: "Kickoff", created_by: @user)

    assert_equal [ direct.id, nested.id ].sort, baseline.baseline_tasks.pluck(:task_id).sort
    assert_equal Date.new(2026, 11, 5), baseline.baseline_tasks.find_by(task: direct).due_date
    assert_equal @user, baseline.created_by
  end

  test "later date changes do not change the baseline" do
    task = @workspace.tasks.create!(title: "A", folder: @folder, due_date: Date.new(2026, 11, 5))
    baseline = Baseline.snapshot!(folder: @folder, name: "Kickoff")
    task.update!(due_date: Date.new(2026, 12, 1))
    assert_equal Date.new(2026, 11, 5), baseline.baseline_tasks.first.due_date
  end

  test "a name is required and deleting a task or baseline removes its rows" do
    assert_raises(ActiveRecord::RecordInvalid) { Baseline.snapshot!(folder: @folder, name: "") }
    task = @workspace.tasks.create!(title: "A", folder: @folder, due_date: Date.new(2026, 11, 5))
    baseline = Baseline.snapshot!(folder: @folder, name: "Kickoff")
    assert_difference "BaselineTask.count", -1 do
      task.destroy
    end
    assert_difference "Baseline.count", -1 do
      baseline.destroy
    end
  end
end
