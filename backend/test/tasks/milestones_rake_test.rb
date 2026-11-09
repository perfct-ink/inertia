require "test_helper"
require "rake"

# `rails milestones:from_events`: a dry run unless APPLY=1, and it names the
# database it is connected to. The copying rules are in
# milestone_event_migration_test.rb.
class MilestonesRakeTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("milestones:from_events")
    @user = User.create!(name: "Ada", email: "milestones-rake-ada@example.com", password: "password123")
    @workspace = @user.workspace
    @workspace.events.create!(title: "Beta", date: Date.current + 30, event_type: :milestone)
  end

  teardown do
    ENV.delete("APPLY")
    ENV.delete("WORKSPACE_ID")
  end

  def run_task(env = {})
    env.each { |name, value| ENV[name] = value }
    task = Rake::Task["milestones:from_events"]
    task.reenable
    output, = capture_io { task.invoke }
    output
  end

  test "it is a dry run by default: it names the database, lists the copy and writes nothing" do
    assert_no_difference "Milestone.count" do
      output = run_task
      assert_includes output, "Database: #{ActiveRecord::Base.connection_db_config.database}"
      assert_includes output, "dry run, nothing written): 1"
      assert_includes output, "run again with APPLY=1"
    end
  end

  test "APPLY=1 creates the milestones and a second run finds nothing to do" do
    assert_difference "Milestone.count", 1 do
      assert_includes run_task("APPLY" => "1"), "milestones created: 1"
    end
    assert_no_difference "Milestone.count" do
      assert_includes run_task("APPLY" => "1"), "milestones created: 0"
    end
  end

  test "any other APPLY value is still a dry run" do
    assert_no_difference "Milestone.count" do
      run_task("APPLY" => "true")
    end
  end
end
