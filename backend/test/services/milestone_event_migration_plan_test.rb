require "test_helper"

# The matching and idempotency rules, over plain objects (no database).
class MilestoneEventMigrationPlanTest < ActiveSupport::TestCase
  Event = Struct.new(:id, :workspace_id, :folder_id, :title, :description, :date, keyword_init: true)
  Milestone = Struct.new(:id, :workspace_id, :title, :target_date, :source_event_id, keyword_init: true)

  TODAY = Date.new(2026, 11, 2)

  def event(id, title: "Beta launch", date: Date.new(2026, 12, 1), workspace_id: 1, folder_id: nil, description: nil)
    Event.new(id: id, workspace_id: workspace_id, folder_id: folder_id, title: title, description: description, date: date)
  end

  def milestone(id, title: "Beta launch", date: Date.new(2026, 12, 1), workspace_id: 1, source_event_id: nil)
    Milestone.new(id: id, workspace_id: workspace_id, title: title, target_date: date, source_event_id: source_event_id)
  end

  def plan(events, milestones = [])
    MilestoneEventMigration.plan(events, milestones, today: TODAY)
  end

  test "an event with no milestone gets one carrying its title, description, date and folder" do
    result = plan([ event(7, description: "Ship it", folder_id: 3) ])
    assert_equal [ {
      workspace_id: 1, folder_id: 3, title: "Beta launch", description: "Ship it",
      target_date: Date.new(2026, 12, 1), status: "planned", source_event_id: 7
    } ], result.creates
    assert_empty result.skips
  end

  test "a past-dated event becomes a done milestone, today's and later ones planned" do
    result = plan([ event(1, date: TODAY - 1), event(2, title: "b", date: TODAY), event(3, title: "c", date: TODAY + 30) ])
    assert_equal %w[done planned planned], result.creates.map { |attrs| attrs[:status] }
  end

  test "an event already copied is skipped even after its milestone was renamed and re-dated" do
    copied = milestone(20, title: "Renamed", date: Date.new(2027, 3, 1), source_event_id: 7)
    result = plan([ event(7) ], [ copied ])
    assert_empty result.creates
    assert_equal [ MilestoneEventMigration::ALREADY_COPIED ], result.skips.map(&:reason)
    assert_equal 20, result.skips.first.milestone_id
  end

  test "a milestone with the same Space, title and date counts as a match, ignoring case and outer spaces" do
    result = plan([ event(7, title: "  beta LAUNCH ") ], [ milestone(20) ])
    assert_empty result.creates
    assert_equal [ MilestoneEventMigration::MATCHING_MILESTONE ], result.skips.map(&:reason)
    assert_equal 20, result.skips.first.milestone_id
  end

  test "a different date, title or Space is not a match" do
    existing = [ milestone(20) ]
    assert_equal 1, plan([ event(1, date: Date.new(2026, 12, 2)) ], existing).creates.size
    assert_equal 1, plan([ event(2, title: "Beta") ], existing).creates.size
    assert_equal 1, plan([ event(3, workspace_id: 2) ], existing).creates.size
  end

  test "two identical events share one milestone and the earlier event wins" do
    result = plan([ event(9), event(4) ])
    assert_equal [ 4 ], result.creates.map { |attrs| attrs[:source_event_id] }
    assert_equal [ MilestoneEventMigration::DUPLICATE_EVENT ], result.skips.map(&:reason)
    assert_equal 4, result.skips.first.other_event_id
  end

  test "the same title and date in different Spaces each get a milestone" do
    result = plan([ event(1, workspace_id: 1), event(2, workspace_id: 2) ])
    assert_equal [ 1, 2 ], result.creates.map { |attrs| attrs[:workspace_id] }
  end

  test "an event with a blank title is reported, not copied" do
    result = plan([ event(1, title: "  ") ])
    assert_empty result.creates
    assert_equal [ MilestoneEventMigration::BLANK_TITLE ], result.skips.map(&:reason)
  end

  test "running the plan again over its own result creates nothing" do
    events = [ event(1), event(2, title: "GA", date: Date.new(2027, 1, 15)), event(3) ]
    first = plan(events)
    created = first.creates.each_with_index.map do |attrs, index|
      milestone(100 + index, title: attrs[:title], date: attrs[:target_date], workspace_id: attrs[:workspace_id], source_event_id: attrs[:source_event_id])
    end
    second = plan(events, created)
    assert_empty second.creates
    assert_equal [ 1, 2, 3 ], second.skips.map(&:event_id).sort
  end

  test "the report says what a dry run would create and writes nothing" do
    result = MilestoneEventMigration::Result.new(plan: plan([ event(1), event(2, title: "x") ], [ milestone(5, title: "x") ]), applied: false, created: [], failed: [], raced: [])
    assert_includes result.report, "Milestone-type events: 2"
    assert_includes result.report, "already have a milestone: 1"
    assert_includes result.report, "milestones to create (dry run, nothing written): 1"
    assert_includes result.report, 'event 1 "Beta launch" (2026-12-01) -> planned'
  end
end
