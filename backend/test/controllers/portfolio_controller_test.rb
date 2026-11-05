require "test_helper"

class PortfolioControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-portfolio@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "lists projects with owner, status, dates, progress and health; plain folders and archived projects are left out" do
    album = @workspace.folders.create!(name: "Album", kind: :project, owner: @user, project_status: :active, start_date: Date.current - 30, target_date: Date.current + 5)
    sub = @workspace.folders.create!(name: "Mixes", parent: album)
    @workspace.tasks.create!(title: "A", folder: album, status: :done)
    @workspace.tasks.create!(title: "B", folder: sub, status: :todo)
    @workspace.tasks.create!(title: "C", folder: album, status: :todo)
    @workspace.folders.create!(name: "Plain folder")
    @workspace.folders.create!(name: "Old", kind: :project).archive!

    get "/api/v1/portfolio", headers: @headers
    assert_response :success
    assert_equal [ "Album" ], response.parsed_body.map { |p| p["name"] }
    row = response.parsed_body.first
    assert_equal [ "Pat", "active", 3, 1, 33 ], [ row["owner_name"], row["project_status"], row["tasks_count"], row["done_tasks_count"], row["percent"] ]
    assert_equal "at_risk", row["health"]
  end

  test "a project with no tasks is on track at 0%, and a missed target date is off track" do
    @workspace.folders.create!(name: "Empty", kind: :project)
    @workspace.folders.create!(name: "Late", kind: :project, target_date: Date.current - 1)
    get "/api/v1/portfolio", headers: @headers
    by_name = response.parsed_body.index_by { |p| p["name"] }
    assert_equal [ 0, "on_track" ], [ by_name["Empty"]["percent"], by_name["Empty"]["health"] ]
    assert_equal "off_track", by_name["Late"]["health"]
  end

  test "a finished project is on track whatever its dates" do
    @workspace.folders.create!(name: "Shipped", kind: :project, project_status: :done, target_date: Date.current - 40)
    get "/api/v1/portfolio", headers: @headers
    assert_equal "on_track", response.parsed_body.first["health"]
  end

  test "another space's projects are not listed" do
    other = User.create!(name: "O", email: "o-portfolio@example.com", password: "password123")
    other.workspace.folders.create!(name: "Theirs", kind: :project)
    get "/api/v1/portfolio", headers: @headers
    assert_empty response.parsed_body
  end
end
