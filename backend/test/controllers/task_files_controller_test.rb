require "test_helper"

class TaskFilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-taskfile-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Assets")
    @task = @user.workspace.tasks.create!(title: "Design")
    @file = Document.new(title: "mock.png", doc_type: :file, folder: @folder, created_by: @user)
    @file.file.attach(io: StringIO.new("png"), filename: "mock.png", content_type: "image/png")
    @file.save!
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "attach a file, see it on the task, and detach it" do
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: @file.id }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ @file.id ], response.parsed_body["file_ids"]

    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: @file.id }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/tasks/#{@task.id}/files/#{@file.id}", headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body["file_ids"]
  end

  test "a plain document or another space's file cannot be attached" do
    plain = Document.create!(title: "Plain", folder: @folder, created_by: @user)
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: plain.id }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    other = User.create!(name: "O", email: "o-taskfile-api@example.com", password: "password123")
    theirs = Document.new(title: "t.png", doc_type: :file, folder: other.workspace.folders.create!(name: "X"), created_by: other)
    theirs.file.attach(io: StringIO.new("x"), filename: "t.png", content_type: "image/png")
    theirs.save!
    post "/api/v1/tasks/#{@task.id}/files", params: { file_id: theirs.id }, headers: @headers, as: :json
    assert_response :not_found
  end
end
