require "test_helper"

class ReleasePlanTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-plan@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "a music release gets the standard checklist counted back from its date" do
    release = @workspace.releases.create!(title: "Single", kind: :single, release_date: Date.new(2026, 12, 1))
    created = ReleasePlan.apply!(release)

    assert_equal ReleasePlan::MUSIC.size, created.size
    master = release.plan_tasks.find_by!(title: "Master")
    assert_equal Date.new(2026, 12, 1) - 50, master.due_date
    assert_equal(-50, master.release_offset_days)
    assert_equal Date.new(2026, 12, 1), release.plan_tasks.find_by!(title: "Release day").due_date
    assert_equal Date.new(2026, 12, 8), release.plan_tasks.find_by!(title: "Post-release follow-up").due_date
    assert_equal ReleasePlan::MUSIC.size, release.tasks_count
  end

  test "a music video gets the video checklist" do
    release = @workspace.releases.create!(title: "Video", kind: :music_video, release_date: Date.new(2026, 12, 1))
    assert_equal ReleasePlan::VIDEO.map(&:title).sort, ReleasePlan.apply!(release).map(&:title).sort
  end

  test "running it twice adds nothing, and it needs a date" do
    release = @workspace.releases.create!(title: "EP", kind: :ep, release_date: Date.new(2026, 12, 1))
    ReleasePlan.apply!(release)
    assert_no_difference "Task.count" do
      assert_empty ReleasePlan.apply!(release)
    end
    undated = @workspace.releases.create!(title: "Someday", kind: :album)
    assert_raises(ArgumentError) { ReleasePlan.apply!(undated) }
  end

  test "moving the release date moves the plan tasks, and not other tasks" do
    release = @workspace.releases.create!(title: "Single", kind: :single, release_date: Date.new(2026, 12, 1))
    ReleasePlan.apply!(release)
    other = @workspace.tasks.create!(title: "Unrelated", due_date: Date.new(2026, 11, 1))

    release.update!(release_date: Date.new(2027, 1, 15))

    assert_equal Date.new(2027, 1, 15) - 50, release.plan_tasks.find_by!(title: "Master").due_date
    assert_equal Date.new(2026, 11, 1), other.reload.due_date
  end

  test "deleting the release keeps its tasks" do
    release = @workspace.releases.create!(title: "Single", kind: :single, release_date: Date.new(2026, 12, 1))
    ReleasePlan.apply!(release)
    release.destroy
    assert_equal ReleasePlan::MUSIC.size, @workspace.tasks.where(release_id: nil).where.not(release_offset_days: nil).count
  end
end
