require "test_helper"

# MilestoneEventMigration.run against the database. The matching rules
# themselves are in milestone_event_migration_plan_test.rb.
class MilestoneEventMigrationTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "milestone-events-ada@example.com", password: "password123")
    @workspace = @user.workspace
    @other = User.create!(name: "Bo", email: "milestone-events-bo@example.com", password: "password123").workspace
    @today = Date.new(2026, 11, 2)
    @folder = @workspace.folders.create!(name: "Launch")
  end

  def milestone_event(title, date, workspace: @workspace, **attributes)
    workspace.events.create!(title: title, date: date, event_type: :milestone, **attributes)
  end

  def run_migration(**options)
    MilestoneEventMigration.run(today: @today, **options)
  end

  test "a dry run reports the milestones to create and writes nothing" do
    milestone_event("Beta", Date.new(2026, 12, 1))
    assert_no_difference "Milestone.count" do
      result = run_migration
      assert_equal 1, result.plan.creates.size
      assert_empty result.created
      assert_not result.applied
    end
  end

  test "apply creates a milestone with the event's title, description, date and folder" do
    event = milestone_event("Beta", Date.new(2026, 12, 1), description: "Public beta", folder: @folder)
    result = run_migration(apply: true)
    milestone = Milestone.find(result.created.sole)
    assert_equal [ @workspace.id, "Beta", "Public beta", Date.new(2026, 12, 1), @folder.id, event.id ],
                 [ milestone.workspace_id, milestone.title, milestone.description, milestone.target_date, milestone.folder_id, milestone.source_event_id ]
    assert milestone.planned?
    assert_nil milestone.owner_id
  end

  test "a past-dated event becomes a done milestone" do
    milestone_event("Alpha", Date.new(2026, 5, 1))
    run_migration(apply: true)
    assert @workspace.milestones.find_by!(title: "Alpha").done?
  end

  test "running it twice creates no duplicates" do
    milestone_event("Beta", Date.new(2026, 12, 1))
    milestone_event("GA", Date.new(2027, 1, 15), workspace: @other)
    assert_difference "Milestone.count", 2 do
      run_migration(apply: true)
    end
    assert_no_difference "Milestone.count" do
      second = run_migration(apply: true)
      assert_empty second.created
      assert_empty second.plan.creates
    end
  end

  test "a second run still creates nothing after the copied milestone was renamed and re-dated" do
    event = milestone_event("Beta", Date.new(2026, 12, 1))
    run_migration(apply: true)
    @workspace.milestones.find_by!(source_event: event).update!(title: "Public beta", target_date: Date.new(2027, 2, 1))
    assert_no_difference "Milestone.count" do
      run_migration(apply: true)
    end
  end

  test "events, their linked tasks and existing milestones are left untouched" do
    event = milestone_event("Beta", Date.new(2026, 12, 1), description: "Public beta")
    task = @workspace.tasks.create!(title: "Write the announcement")
    event.event_tasks.create!(task: task)
    existing = @workspace.milestones.create!(title: "Alpha", target_date: Date.new(2026, 10, 1), status: :active)
    events_before = Event.order(:id).map(&:attributes)
    existing_before = existing.reload.attributes

    run_migration(apply: true)

    assert_equal events_before, Event.order(:id).map(&:attributes)
    assert_equal [ task.id ], event.reload.tasks.pluck(:id)
    assert_nil task.reload.milestone_id
    assert_equal existing_before, existing.reload.attributes
  end

  test "a milestone already made by hand for the same title and date is not duplicated" do
    @workspace.milestones.create!(title: "beta ", target_date: Date.new(2026, 12, 1))
    milestone_event("Beta", Date.new(2026, 12, 1))
    assert_no_difference "Milestone.count" do
      run_migration(apply: true)
    end
  end

  test "deadline events are not copied" do
    @workspace.events.create!(title: "Tax day", date: Date.new(2026, 12, 1), event_type: :deadline)
    assert_no_difference "Milestone.count" do
      run_migration(apply: true)
    end
  end

  test "workspace_id limits the run to one Space" do
    milestone_event("Beta", Date.new(2026, 12, 1))
    milestone_event("GA", Date.new(2027, 1, 15), workspace: @other)
    run_migration(apply: true, workspace_id: @other.id)
    assert_equal [ "GA" ], Milestone.where(workspace_id: [ @workspace.id, @other.id ]).pluck(:title)
  end

  test "an event whose milestone fails validation is reported and the others are still copied" do
    foreign_folder = @other.folders.create!(name: "Elsewhere")
    broken = milestone_event("Broken", Date.new(2026, 12, 1), folder: foreign_folder)
    milestone_event("Fine", Date.new(2026, 12, 2))
    result = run_migration(apply: true)
    assert_equal [ "Fine" ], Milestone.where(id: result.created).pluck(:title)
    assert_equal [ broken.id ], result.failed.map { |failure| failure[:event_id] }
    assert_includes result.report, "FAILED event #{broken.id}"
  end

  test "deleting the event keeps the milestone and clears its link" do
    event = milestone_event("Beta", Date.new(2026, 12, 1))
    run_migration(apply: true)
    milestone = @workspace.milestones.find_by!(title: "Beta")
    event.destroy
    assert_nil milestone.reload.source_event_id
  end

  test "two milestones cannot point at the same event" do
    event = milestone_event("Beta", Date.new(2026, 12, 1))
    @workspace.milestones.create!(title: "One", source_event: event)
    assert_raises(ActiveRecord::RecordNotUnique) do
      @workspace.milestones.create!(title: "Two", source_event: event)
    end
  end

  test "a milestone's source event must belong to the same Space" do
    event = milestone_event("Beta", Date.new(2026, 12, 1), workspace: @other)
    milestone = @workspace.milestones.new(title: "x", source_event: event)
    assert_not milestone.valid?
    assert_includes milestone.errors[:source_event], "must belong to the same workspace"
  end
end
