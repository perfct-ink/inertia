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
end
