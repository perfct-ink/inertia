require "test_helper"

class TaskFilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-taskfile-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-taskfile-api@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @user)
    @workspace.memberships.create!(user: @viewer, role: :viewer)
    @folder = @workspace.folders.create!(name: "Assets")
    @task = @workspace.tasks.create!(title: "Design")
    @file = file_item(@folder, @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @workspace.id.to_s }
  end

  def file_item(folder, user, name = "mock.png")
    document = Document.new(title: name, doc_type: :file, folder: folder, created_by: user)
    document.file.attach(io: StringIO.new("png"), filename: name, content_type: "image/png")
    document.save!
    document
  end

  test "attach a file, see it on the task list, and detach it" do
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: @file.id }, headers: headers_for(@user), as: :json
    assert_response :created
    assert_equal [ @file.id ], response.parsed_body["file_ids"]

    get "/api/v1/tasks", headers: headers_for(@user)
    assert_equal [ [ @file.id ] ], response.parsed_body.map { |t| t["file_ids"] }

    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: @file.id }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/tasks/#{@task.id}/files/#{@file.id}", headers: headers_for(@user)
    assert_response :success
    assert_equal [], response.parsed_body["file_ids"]
    assert Document.exists?(@file.id), "detaching must not delete the file"
  end

  test "several files, in the order they were attached" do
    second = file_item(@folder, @user, "second.png")
    [ @file, second ].each { |f| post "/api/v1/tasks/#{@task.id}/files", params: { file_id: f.id }, headers: headers_for(@user), as: :json }
    assert_equal [ @file.id, second.id ], response.parsed_body["file_ids"]
  end

  test "a plain document, a missing file or another Space's file cannot be attached" do
    plain = Document.create!(title: "Plain", folder: @folder, created_by: @user)
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: plain.id }, headers: headers_for(@user), as: :json
    assert_response :not_found

    post "/api/v1/tasks/#{@task.id}/files", params: {}, headers: headers_for(@user), as: :json
    assert_response :bad_request

    other = User.create!(name: "O", email: "o-taskfile-api@example.com", password: "password123")
    theirs = file_item(other.workspace.folders.create!(name: "X"), other, "t.png")
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: theirs.id }, headers: headers_for(@user), as: :json
    assert_response :not_found
    assert_equal 0, TaskFile.count
  end

  test "another Space's task is not found" do
    other = User.create!(name: "O", email: "o2-taskfile-api@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")
    post "/api/v1/tasks/#{theirs.id}/files", params: { file_id: @file.id }, headers: headers_for(@user), as: :json
    assert_response :not_found
  end

  test "viewers can't attach or detach" do
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: @file.id }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden

    @task.task_files.create!(file: @file)
    delete "/api/v1/tasks/#{@task.id}/files/#{@file.id}", headers: headers_for(@viewer)
    assert_response :forbidden
    assert_equal 1, @task.task_files.count
  end
end
