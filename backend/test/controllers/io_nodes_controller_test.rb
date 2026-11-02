require "test_helper"

class IoNodesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-io-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "build a map: goal, csf, nc, then link, rename and delete" do
    post "/api/v1/io_nodes", params: { io_node: { title: "Goal" } }, headers: @headers, as: :json
    assert_response :created
    goal = response.parsed_body.first
    assert_equal "goal", goal["kind"]

    post "/api/v1/io_nodes", params: { io_node: { title: "Fast", parent_id: goal["id"] } }, headers: @headers, as: :json
    csf = response.parsed_body.find { |n| n["kind"] == "csf" }
    post "/api/v1/io_nodes", params: { io_node: { title: "Quick", parent_id: csf["id"] } }, headers: @headers, as: :json
    assert_equal %w[goal csf nc], response.parsed_body.map { |n| n["kind"] }

    objective = @user.workspace.objectives.create!(title: "Grow")
    patch "/api/v1/io_nodes/#{csf['id']}", params: { io_node: { title: "Very fast", objective_id: objective.id } }, headers: @headers, as: :json
    assert_equal objective.id, response.parsed_body.find { |n| n["id"] == csf["id"] }["objective_id"]

    delete "/api/v1/io_nodes/#{csf['id']}", headers: @headers
    assert_equal [ "goal" ], response.parsed_body.map { |n| n["kind"] }
  end

  test "a second goal, a child of an nc and a blank title are rejected" do
    post "/api/v1/io_nodes", params: { io_node: { title: "Goal" } }, headers: @headers, as: :json
    post "/api/v1/io_nodes", params: { io_node: { title: "Again" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/io_nodes", params: { io_node: { title: "" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's nodes are not found" do
    other = User.create!(name: "O", email: "o-io-api@example.com", password: "password123")
    theirs = other.workspace.io_nodes.create!(kind: :goal, title: "Theirs")
    post "/api/v1/io_nodes", params: { io_node: { title: "x", parent_id: theirs.id } }, headers: @headers, as: :json
    assert_response :not_found
    patch "/api/v1/io_nodes/#{theirs.id}", params: { io_node: { title: "y" } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
