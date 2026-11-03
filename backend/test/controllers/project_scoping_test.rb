require "test_helper"

class ProjectScopingTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-project-scope@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @project = @workspace.folders.create!(name: "Messages", kind: :project)
    @design = @workspace.folders.create!(name: "Design", parent: @project)
    @other = @workspace.folders.create!(name: "Billing", kind: :project)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def in_project(folder = @project) = @headers.merge("X-Project-Id" => folder.id.to_s)

  def titles(path, headers) = (get(path, headers: headers) && response.parsed_body.map { |r| r["title"] }).sort

  test "lists hold only the selected project's records, subfolders included" do
    %i[initiatives sprints ideas releases objectives epics milestones].each do |kind|
      records = @workspace.public_send(kind)
      records.create!(title: "In project", folder: @project)
      records.create!(title: "In subfolder", folder: @design)
      records.create!(title: "Elsewhere", folder: @other)
      records.create!(title: "Space-wide")

      path = "/api/v1/#{kind}"
      assert_equal [ "In project", "In subfolder" ], titles(path, in_project), kind
      assert_equal 4, titles(path, @headers).size, "#{kind} without a project"
    end
  end

  test "tasks reach a project directly or through a document in it" do
    doc = @design.documents.create!(title: "Plan", created_by: @user)
    @workspace.tasks.create!(title: "Direct", folder: @project)
    @workspace.tasks.create!(title: "Through a doc", document: doc)
    @workspace.tasks.create!(title: "Elsewhere", folder: @other)
    assert_equal [ "Direct", "Through a doc" ], titles("/api/v1/tasks", in_project)
  end

  test "new records are filed in the selected project" do
    post "/api/v1/sprints", params: { sprint: { title: "S1" } }, headers: in_project, as: :json
    assert_response :created
    assert_equal @project.id, response.parsed_body["folder_id"]

    post "/api/v1/tasks", params: { task: { title: "T", folder_id: @design.id } }, headers: in_project, as: :json
    assert_equal @design.id, response.parsed_body["folder_id"], "a folder the request names wins"
  end

  test "a promoted idea stays in its project" do
    idea = @workspace.ideas.create!(title: "Dark mode", folder: @project)
    assert_equal @project, idea.promote!("epic").folder
  end

  test "another space's folder is not found, and records can't point at one" do
    theirs = User.create!(name: "O", email: "o-project-scope@example.com", password: "password123").workspace
    folder = theirs.folders.create!(name: "Theirs", kind: :project)
    get "/api/v1/sprints", headers: in_project(folder)
    assert_response :not_found
    refute @workspace.sprints.new(title: "S", folder: folder).valid?
  end

  test "a project keeps an emoji and an image" do
    patch "/api/v1/folders/#{@project.id}", params: { folder: { icon: "🚀", image_url: "/rails/active_storage/blobs/x/logo.png" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ "🚀", "/rails/active_storage/blobs/x/logo.png" ], [ @project.reload.icon, @project.image_url ]

    patch "/api/v1/folders/#{@project.id}", params: { folder: { image_url: "javascript:alert(1)" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end
end
