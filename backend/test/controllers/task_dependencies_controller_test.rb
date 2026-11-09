require "test_helper"

class TaskDependenciesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-dep-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @a = @user.workspace.tasks.create!(title: "A")
    @b = @user.workspace.tasks.create!(title: "B")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create list and delete a dependency" do
    post "/api/v1/task_dependencies", params: { task_dependency: { predecessor_id: @a.id, successor_id: @b.id, kind: "start_to_start" } }, headers: @headers, as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert_equal "start_to_start", response.parsed_body["kind"]

    get "/api/v1/task_dependencies", headers: @headers
    assert_equal [ [ @a.id, @b.id ] ], response.parsed_body.map { |d| [ d["predecessor_id"], d["successor_id"] ] }

    post "/api/v1/task_dependencies", params: { task_dependency: { predecessor_id: @b.id, successor_id: @a.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/task_dependencies/#{id}", headers: @headers
    assert_response :no_content
    assert_equal 0, TaskDependency.count
  end

  test "a task from another space is not found" do
    foreign = User.create!(name: "O", email: "o-dep-api@example.com", password: "password123").workspace.tasks.create!(title: "X")
    post "/api/v1/task_dependencies", params: { task_dependency: { predecessor_id: @a.id, successor_id: foreign.id } }, headers: @headers, as: :json
    assert_response :not_found
  end

  test "a link names both of its tasks, with their dates and folder" do
    billing = @user.workspace.folders.create!(name: "Billing", kind: :project)
    document = billing.documents.create!(title: "Plan", created_by: @user)
    vendor = @user.workspace.tasks.create!(title: "Vendor contract", document: document, start_date: "2026-11-01", due_date: "2026-11-05")

    post "/api/v1/task_dependencies", params: { task_dependency: { predecessor_id: vendor.id, successor_id: @a.id } }, headers: @headers, as: :json
    assert_response :created
    predecessor = response.parsed_body["predecessor"]
    assert_equal [ vendor.id, "Vendor contract", "2026-11-01", "2026-11-05", billing.id ],
                 predecessor.values_at("id", "title", "start_date", "due_date", "folder_id")
    assert_equal [ @a.id, "A", nil ], response.parsed_body["successor"].values_at("id", "title", "folder_id")
  end

  test "a link between two projects is listed whichever project is open" do
    messages = @user.workspace.folders.create!(name: "Messages", kind: :project)
    billing = @user.workspace.folders.create!(name: "Billing", kind: :project)
    build = @user.workspace.tasks.create!(title: "Build", folder: messages)
    vendor = @user.workspace.tasks.create!(title: "Vendor contract", folder: billing)
    TaskDependency.create!(predecessor: vendor, successor: build)

    [ messages, billing ].each do |project|
      get "/api/v1/task_dependencies", headers: @headers.merge("X-Project-Id" => project.id.to_s)
      assert_response :success
      assert_equal [ [ vendor.id, build.id ] ], response.parsed_body.map { |d| [ d["predecessor_id"], d["successor_id"] ] }
    end
  end
end
