require "test_helper"

class TaskFileTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-taskfile@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Assets")
    @task = @workspace.tasks.create!(title: "Design")
  end

  def file_item(folder = @folder, user = @user)
    document = Document.new(title: "mock.png", doc_type: :file, folder: folder, created_by: user)
    document.file.attach(io: StringIO.new("png"), filename: "mock.png", content_type: "image/png")
    document.save!
    document
  end

  test "a task can have several files, each once" do
    a = file_item
    b = file_item
    @task.task_files.create!(file: a)
    @task.task_files.create!(file: b)
    assert_equal [ a, b ].sort_by(&:id), @task.files.sort_by(&:id)
    assert_not @task.task_files.build(file: a).valid?
  end

  test "only uploaded files from the same space can be attached" do
    plain = Document.create!(title: "Plain", folder: @folder, created_by: @user)
    assert_not @task.task_files.build(file: plain).valid?
    other = User.create!(name: "O", email: "o-taskfile@example.com", password: "password123")
    foreign = file_item(other.workspace.folders.create!(name: "X"), other)
    assert_not @task.task_files.build(file: foreign).valid?
  end

  test "deleting the file or the task removes the link, not the other side" do
    file = file_item
    @task.task_files.create!(file: file)
    file.destroy
    assert_empty @task.reload.task_files
    other_file = file_item
    @task.task_files.create!(file: other_file)
    @task.destroy
    assert other_file.reload.persisted?
  end
end
