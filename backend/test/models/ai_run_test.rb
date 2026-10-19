require "test_helper"

class AiRunTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-ai@example.com", password: "password123")
    @workspace = @user.workspace
    @task = @workspace.tasks.create!(title: "Draft the launch post")
    @worker = @workspace.ai_workers.create!(name: "Writer")
  end

  test "queues by default and rejects a disabled worker" do
    assert @workspace.ai_runs.create!(ai_worker: @worker, task: @task).queued?

    @worker.update!(enabled: false)
    run = @workspace.ai_runs.new(ai_worker: @worker, task: @workspace.tasks.create!(title: "Other"))
    assert_not run.valid?
    assert_includes run.errors[:ai_worker], "is disabled"
  end

  test "rejects a second active run for the same task and worker" do
    @workspace.ai_runs.create!(ai_worker: @worker, task: @task)
    run = @workspace.ai_runs.new(ai_worker: @worker, task: @task)

    assert_not run.valid?
    assert_includes run.errors[:base], "This worker is already working on this task"
  end

  test "allows another run once the first has finished" do
    @workspace.ai_runs.create!(ai_worker: @worker, task: @task).update!(status: :succeeded)
    assert @workspace.ai_runs.new(ai_worker: @worker, task: @task).valid?
  end

  test "rejects a worker or task from another workspace" do
    bob = User.create!(name: "Bob", email: "bob-ai@example.com", password: "password123")
    run = @workspace.ai_runs.new(
      ai_worker: bob.workspace.ai_workers.create!(name: "Elsewhere"),
      task: bob.workspace.tasks.create!(title: "Elsewhere")
    )

    assert_not run.valid?
    assert_includes run.errors[:ai_worker], "must belong to the same workspace"
    assert_includes run.errors[:task], "must belong to the same workspace"
  end
end
