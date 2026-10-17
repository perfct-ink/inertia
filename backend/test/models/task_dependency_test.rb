require "test_helper"

class TaskDependencyTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-dep@example.com", password: "password123")
    @workspace = @user.workspace
    @a, @b, @c = %w[A B C].map { |t| @workspace.tasks.create!(title: t) }
  end

  def link(from, to, kind: :finish_to_start)
    TaskDependency.new(predecessor: from, successor: to, kind: kind)
  end

  test "defaults to finish to start and takes the tasks' space" do
    dep = link(@a, @b)
    assert dep.save
    assert dep.finish_to_start?
    assert_equal @workspace.id, dep.workspace_id
  end

  test "rejects self links, duplicates, unknown kinds and tasks from another space" do
    assert_not link(@a, @a).valid?
    link(@a, @b).save!
    assert_not link(@a, @b, kind: :start_to_start).valid?
    assert_not TaskDependency.new(predecessor: @b, successor: @c, kind: "sideways").valid?
    other = User.create!(name: "O", email: "o-dep@example.com", password: "password123").workspace.tasks.create!(title: "X")
    assert_not link(@a, other).valid?
  end

  test "rejects a link that would close a loop" do
    link(@a, @b).save!
    link(@b, @c).save!
    dep = link(@c, @a)
    assert_not dep.valid?
    assert_includes dep.errors[:base], "That dependency would create a loop"
  end

  test "deleting a task removes its links" do
    link(@a, @b).save!
    assert_difference -> { TaskDependency.count }, -1 do
      @b.destroy
    end
  end
end
