require "test_helper"

class MilestoneRollupTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-rollup@example.com", password: "password123")
    @workspace = @user.workspace
    @beta = @workspace.milestones.create!(title: "Beta")
    @ga = @workspace.milestones.create!(title: "GA")
  end

  test "a task counts toward its own milestone" do
    @workspace.tasks.create!(title: "Direct", milestone: @beta, status: :done)
    @workspace.tasks.create!(title: "Direct open", milestone: @beta, status: :todo)

    summary = MilestoneRollup.for(@workspace)[@beta.id]
    assert_equal 2, summary.tasks_count
    assert_equal 1, summary.done_tasks_count
    assert_equal 50, summary.percent
  end

  test "a task inherits its epic's milestone, and an epic inherits its initiative's" do
    initiative = @workspace.initiatives.create!(title: "Theme", milestone: @beta)
    via_initiative = @workspace.epics.create!(title: "E1", initiative: initiative)
    own = @workspace.epics.create!(title: "E2", initiative: initiative, milestone: @ga)
    @workspace.tasks.create!(title: "T1", epic: via_initiative, status: :done)
    @workspace.tasks.create!(title: "T2", epic: own)

    rollups = MilestoneRollup.for(@workspace)
    assert_equal 1, rollups[@beta.id].tasks_count
    assert_equal 1, rollups[@beta.id].done_tasks_count
    assert_equal 1, rollups[@beta.id].epics_count
    assert_equal 1, rollups[@beta.id].initiatives_count
    assert_equal 1, rollups[@ga.id].tasks_count
    assert_equal 1, rollups[@ga.id].epics_count
  end

  test "a task's own milestone overrides the one it would inherit" do
    epic = @workspace.epics.create!(title: "E", milestone: @beta)
    @workspace.tasks.create!(title: "Moved", epic: epic, milestone: @ga)

    rollups = MilestoneRollup.for(@workspace)
    assert_equal 0, rollups.fetch(@beta.id, MilestoneRollup::EMPTY).tasks_count
    assert_equal 1, rollups[@ga.id].tasks_count
  end

  test "tasks with no milestone anywhere are not counted and empty milestones are zero" do
    @workspace.tasks.create!(title: "Loose")
    assert_equal 0, MilestoneRollup.for(@workspace).fetch(@beta.id, MilestoneRollup::EMPTY).percent
  end
end
