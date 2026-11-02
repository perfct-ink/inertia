require "test_helper"

# PATCH /api/v1/tasks/:id and the folder's dependency mode (PM-14): the server
# applies the mode so edits from any client obey it, not just Gantt drags.
class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-tasks-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Launch")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  # Three tasks laid end to end, each finish to start: a -> b -> c.
  def chain(folder: @folder, mode: "none")
    folder.update!(dependency_mode: mode)
    @a = @workspace.tasks.create!(title: "A", folder: folder, start_date: "2026-01-01", due_date: "2026-01-05")
    @b = @workspace.tasks.create!(title: "B", folder: folder, start_date: "2026-01-05", due_date: "2026-01-08")
    @c = @workspace.tasks.create!(title: "C", folder: folder, start_date: "2026-01-08", due_date: "2026-01-10")
    TaskDependency.create!(predecessor: @a, successor: @b)
    TaskDependency.create!(predecessor: @b, successor: @c)
  end

  def patch_task(task, attrs)
    patch "/api/v1/tasks/#{task.id}", params: { task: attrs }, headers: @headers, as: :json
  end

  def dates(task)
    task.reload.then { |t| [ t.start_date.to_s, t.due_date.to_s ] }
  end

  test "ignore mode moves only the task" do
    chain
    patch_task(@a, start_date: "2026-01-10", due_date: "2026-01-15")
    assert_response :success
    assert_equal [], response.parsed_body["rescheduled"]
    assert_equal [ "2026-01-10", "2026-01-15" ], dates(@a)
    assert_equal [ "2026-01-05", "2026-01-08" ], dates(@b)
  end

  test "strict mode rejects a move that breaks a link and changes nothing" do
    chain(mode: "strict")
    patch_task(@a, start_date: "2026-01-02", due_date: "2026-01-06")
    assert_response :unprocessable_entity
    assert_equal [ 'That would break the dependency of "B" on "A".' ], response.parsed_body["errors"]
    assert_equal [ "2026-01-01", "2026-01-05" ], dates(@a)

    patch_task(@b, start_date: "2026-01-03", due_date: "2026-01-06")
    assert_response :unprocessable_entity
    assert_equal [ "2026-01-05", "2026-01-08" ], dates(@b)
  end

  test "strict mode accepts a move that keeps every link" do
    chain(mode: "strict")
    patch_task(@a, start_date: "2025-12-30", due_date: "2026-01-04")
    assert_response :success
    assert_equal [ "2025-12-30", "2026-01-04" ], dates(@a)
  end

  test "strict mode does not stop edits that leave the dates alone" do
    chain(mode: "strict")
    patch_task(@a, title: "A renamed", status: "in_progress")
    assert_response :success
    assert_equal "A renamed", @a.reload.title
  end

  test "flexible mode pushes dependants later and lists them" do
    chain(mode: "flexible")
    patch_task(@a, start_date: "2026-01-03", due_date: "2026-01-07")
    assert_response :success
    assert_equal [ @b.id, @c.id ], response.parsed_body["rescheduled"].map { |t| t["id"] }
    assert_equal [ "2026-01-07", "2026-01-10" ], dates(@b)
    assert_equal [ "2026-01-10", "2026-01-12" ], dates(@c)
  end

  test "flexible mode pulls dependants that were on their link earlier" do
    chain(mode: "flexible")
    patch_task(@a, start_date: "2025-12-28", due_date: "2026-01-02")
    assert_response :success
    assert_equal [ "2026-01-02", "2026-01-05" ], dates(@b)
    assert_equal [ "2026-01-05", "2026-01-07" ], dates(@c)
  end

  test "flexible mode leaves a dependant with room to spare" do
    chain(mode: "flexible")
    @b.update!(start_date: "2026-01-07", due_date: "2026-01-09")
    patch_task(@a, start_date: "2025-12-28", due_date: "2026-01-02")
    assert_response :success
    assert_equal [], response.parsed_body["rescheduled"]
    assert_equal [ "2026-01-07", "2026-01-09" ], dates(@b)
  end

  test "a task in a document follows the mode of the document's folder" do
    chain(mode: "none")
    @folder.update!(dependency_mode: "strict")
    document = @folder.documents.create!(title: "Plan", created_by: @user)
    @a.update!(folder: nil, document: document)
    patch_task(@a, start_date: "2026-01-02", due_date: "2026-01-06")
    assert_response :unprocessable_entity
  end

  test "the mode of another folder does not apply" do
    other = @workspace.folders.create!(name: "Elsewhere", dependency_mode: "strict")
    chain(mode: "none")
    @a.update!(folder: other)
    @b.update!(folder: @folder)
    patch_task(@b, start_date: "2026-01-01", due_date: "2026-01-04")
    assert_response :success
  end

  test "an invalid update is still a 422 with its own message" do
    chain(mode: "flexible")
    patch_task(@a, start_date: "2026-01-09", due_date: "2026-01-02")
    assert_response :unprocessable_entity
    assert_equal [ "Due date can't be before the start date" ], response.parsed_body["errors"]
  end
end
