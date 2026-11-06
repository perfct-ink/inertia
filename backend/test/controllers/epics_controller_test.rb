require "test_helper"

class EpicsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "epics-owner@example.com", password: "password123")
    @space = @owner.workspace
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, project: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Project-Id"] = project.id.to_s if project
    headers
  end

  def create_feature(title = "Launch", project: nil)
    post "/api/v1/epics", params: { epic: { title: title } }, headers: headers_for(@owner, project: project), as: :json
    assert_response :created
    response.parsed_body
  end

  test "creating a feature makes its requirements document and answers with its id" do
    feature = create_feature

    document = Document.find(feature["document_id"])
    assert_equal "Launch", document.title
    assert_equal @owner, document.created_by
    assert_equal @space.personal_project, document.folder
    assert_equal feature["id"], document.feature_epic.id
  end

  test "a feature made inside a project keeps its document in the project, and makes no Personal Project" do
    project = @space.folders.create!(name: "Messages", kind: :project)
    feature = create_feature(project: project)

    assert_equal project.id, feature["folder_id"]
    assert_equal project, Document.find(feature["document_id"]).folder
    assert_not @space.folders.exists?(name: "Personal Project")
  end

  test "a feature without a title is rejected and leaves no document behind" do
    assert_no_difference -> { Document.count } do
      post "/api/v1/epics", params: { epic: { title: "" } }, headers: headers_for(@owner), as: :json
    end
    assert_response :unprocessable_entity
  end

  test "the listing includes each feature's document" do
    feature = create_feature
    get "/api/v1/epics", headers: headers_for(@owner)
    assert_response :success
    assert_equal [ feature["document_id"] ], response.parsed_body.map { |e| e["document_id"] }
  end

  test "deleting a feature deletes its requirements document" do
    feature = create_feature
    delete "/api/v1/epics/#{feature['id']}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not Document.exists?(feature["document_id"])
  end

  test "the requirements document cannot be deleted on its own" do
    feature = create_feature
    delete "/api/v1/documents/#{feature['document_id']}", headers: headers_for(@owner)
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].first, "Delete the feature instead"
    assert Document.exists?(feature["document_id"])
  end

  test "an ordinary document can still be deleted" do
    document = @space.root_folder.documents.create!(title: "Notes", created_by: @owner)
    delete "/api/v1/documents/#{document.id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not Document.exists?(document.id)
  end

  test "tasks written in the requirements document count towards the feature" do
    feature = create_feature
    post "/api/v1/documents/#{feature['document_id']}/tasks", params: { task: { title: "Write it" } }, headers: headers_for(@owner), as: :json
    assert_response :created
    assert_equal feature["id"], response.parsed_body["epic_id"]

    get "/api/v1/epics", headers: headers_for(@owner)
    assert_equal 1, response.parsed_body.first["tasks_count"]
  end
end
