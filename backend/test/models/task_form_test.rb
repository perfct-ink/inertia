require "test_helper"

class TaskFormTest < ActiveSupport::TestCase
  setup do
    @previous_public = Rails.configuration.x.public_forms_enabled
    @user = User.create!(name: "Pat", email: "pat-taskform@example.com", password: "password123")
    @workspace = @user.workspace
    @form = @workspace.task_forms.create!(title: "Report a bug")
  end

  teardown { Rails.configuration.x.public_forms_enabled = @previous_public }

  test "a new form starts with a title and a details question and gets a token" do
    assert_equal %w[title details], @form.questions.map { |q| q["id"] }
    assert_equal "backlog", @form.default_status
    assert @form.enabled?
    assert_not @form.public_access?
    assert_operator @form.token.length, :>=, 24
    assert_not_equal @form.token, @workspace.task_forms.create!(title: "Another").token
  end

  test "validations: title, status, questions, and everything it points at in the same space" do
    assert_not @workspace.task_forms.new(title: "").valid?
    assert_not @workspace.task_forms.new(title: "x", default_status: "nope").valid?
    assert_not @workspace.task_forms.new(title: "x", questions: [ { "id" => "a", "label" => "A", "kind" => "date", "target" => "details" } ]).valid?

    other = User.create!(name: "O", email: "o-taskform@example.com", password: "password123")
    assert_not @workspace.task_forms.new(title: "x", epic: other.workspace.epics.create!(title: "E")).valid?
    assert_not @workspace.task_forms.new(title: "x", folder: other.workspace.root_folder).valid?
    assert_not @workspace.task_forms.new(title: "x", assignee: other).valid?
    assert @workspace.task_forms.new(title: "x", assignee: @user).valid?
  end

  test "submit makes a task filed where the form says, plus a submission with the answers" do
    epic = @workspace.epics.create!(title: "Support")
    folder = @workspace.root_folder
    @form.update!(default_status: "todo", epic: epic, folder: folder, assignee: @user, questions: [
      { "id" => "summary", "label" => "Summary", "kind" => "short_text", "target" => "title" },
      { "id" => "severity", "label" => "Severity", "kind" => "choice", "target" => "details", "options" => %w[High Low] },
      { "id" => "needed", "label" => "Needed by", "kind" => "date", "target" => "due_date" }
    ])

    outcome = @form.submit({ "summary" => "Login broken", "severity" => "High", "needed" => "2026-12-01" }, user: @user)

    assert outcome.ok?
    task = outcome.submission.task
    assert_equal "Login broken", task.title
    assert_equal "Severity: High", task.description
    assert_equal Date.new(2026, 12, 1), task.due_date
    assert_equal [ "todo", epic.id, folder.id, @user.id, @workspace.id ], [ task.status, task.epic_id, task.folder_id, task.assignee_id, task.workspace_id ]
    assert_equal @user, outcome.submission.submitted_by
    assert_equal [ [ "Summary", "Login broken" ], [ "Severity", "High" ], [ "Needed by", "2026-12-01" ] ], outcome.submission.answers.map { |a| [ a["label"], a["value"] ] }
    assert_equal 1, @form.submissions.count
  end

  test "submit with a wrong answer makes nothing" do
    assert_no_difference [ "Task.count", "TaskFormSubmission.count" ] do
      outcome = @form.submit({ "title" => "" })
      assert_not outcome.ok?
      assert_equal [ "Title can't be blank" ], outcome.errors
    end
  end

  test "submit reports an invalid task and rolls back" do
    @form.update!(questions: [
      { "id" => "t", "label" => "Title", "kind" => "short_text", "target" => "title" },
      { "id" => "s", "label" => "Starts", "kind" => "date", "target" => "start_date" },
      { "id" => "d", "label" => "Due", "kind" => "date", "target" => "due_date" }
    ])
    assert_no_difference [ "Task.count", "TaskFormSubmission.count" ] do
      outcome = @form.submit({ "t" => "x", "s" => "2026-12-05", "d" => "2026-12-01" })
      assert_not outcome.ok?
      assert_equal [ "Due date can't be before the start date" ], outcome.errors
    end
  end

  test "the assignee is told about a task made by someone else, not by themselves" do
    @form.update!(assignee: @user)
    assert_no_difference "Notification.count" do
      @form.submit({ "title" => "Mine" }, user: @user)
    end
    assert_difference "Notification.count", 1 do
      @form.submit({ "title" => "From outside" })
    end
  end

  test "a closed form takes no submissions" do
    @form.update!(enabled: false)
    assert_no_difference "Task.count" do
      outcome = @form.submit({ "title" => "x" })
      assert_equal [ "This form is closed" ], outcome.errors
    end
  end

  test "public access needs the server switch, and the link changes each time it is turned on" do
    Rails.configuration.x.public_forms_enabled = false
    assert_not @form.update(public_access: true)
    assert_includes @form.errors.full_messages, "Public access isn't available on this server"

    Rails.configuration.x.public_forms_enabled = true
    @form.reload
    first = @form.token
    assert @form.update(public_access: true)
    assert_not_equal first, @form.token
    assert @form.public_and_open?

    assert @form.update(public_access: false)
    second = @form.token
    assert @form.update(public_access: true)
    assert_not_equal second, @form.token

    @form.update!(enabled: false)
    assert_not @form.public_and_open?
    Rails.configuration.x.public_forms_enabled = false
    @form.update!(enabled: true)
    assert_not @form.public_and_open?
  end

  test "public submissions are capped per hour; signed-in ones are not counted" do
    TaskForm::PUBLIC_HOURLY_LIMIT.times { @form.submissions.create!(task: @workspace.tasks.create!(title: "t"), answers: []) }
    assert @form.public_throttled?

    other = @workspace.task_forms.create!(title: "Other")
    TaskForm::PUBLIC_HOURLY_LIMIT.times { other.submissions.create!(task: @workspace.tasks.create!(title: "t"), submitted_by: @user, answers: []) }
    assert_not other.public_throttled?
  end

  test "deleting a task removes its submission, deleting a form keeps its tasks" do
    outcome = @form.submit({ "title" => "Keep me" }, user: @user)
    task = outcome.submission.task
    task.destroy
    assert_equal 0, @form.submissions.count

    kept = @form.submit({ "title" => "Still here" }).submission.task
    @form.destroy
    assert Task.exists?(kept.id)
  end

  test "deleting a space deletes its forms" do
    team = Workspace.create!(name: "Team", user: @user)
    team.task_forms.create!(title: "T").submit({ "title" => "x" })
    assert_difference "TaskForm.count", -1 do
      team.destroy
    end
  end
end
