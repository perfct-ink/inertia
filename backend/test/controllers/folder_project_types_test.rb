require "test_helper"

# Starting a project from a type: POST /folders with a project_type and, for the
# built-in types, the template the web app sends (see ProjectTemplate).
class FolderProjectTypesTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-folder-types@example.com", password: "password123")
    @space = @user.workspace
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @space.id.to_s }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def create_folder(folder, template: nil)
    params = { folder: folder }
    params[:template] = template unless template.nil?
    post "/api/v1/folders", params: params, headers: @headers, as: :json
  end

  def release_template
    {
      documents: [ { title: "Release plan", content: { type: "doc", content: [ { type: "paragraph" } ] } } ],
      collections: [ { title: "Tracks", fields: [ { name: "Title", data_type: "text" } ] } ],
      tasks: [ { title: "Mix" }, { title: "Master" } ]
    }
  end

  test "a project is blank unless it names a type, and shows its type" do
    create_folder({ name: "Plain", kind: "project" })
    assert_response :created
    assert_equal "blank", response.parsed_body["project_type"]

    create_folder({ name: "Debut", kind: "project", project_type: "music_release", icon: "🎵" })
    assert_response :created
    assert_equal [ "music_release", "🎵" ], response.parsed_body.values_at("project_type", "icon")
    assert_equal 0, Folder.find(response.parsed_body["id"]).documents.count
  end

  test "an unknown type is refused" do
    create_folder({ name: "Odd", kind: "project", project_type: "bogus" })
    assert_response :unprocessable_entity
    assert_match(/Project type/, response.parsed_body["errors"].join)
  end

  test "a template sent with the project creates its documents, Collections and tasks" do
    create_folder({ name: "Debut", kind: "project", project_type: "music_release" }, template: release_template)
    assert_response :created

    project = Folder.find(response.parsed_body["id"])
    assert_equal [ "Release plan", "Tracks" ], project.documents.order(:id).map(&:title)
    assert_equal [ [ "Title", "text" ] ], project.documents.find_by(title: "Tracks").table_fields.pluck(:name, :data_type)
    assert_equal [ "Mix", "Master" ], @space.tasks.where(folder_id: project.id).pluck(:title)
    assert_equal @user, project.documents.first.created_by
  end

  test "a bad template creates nothing" do
    template = release_template.merge(tasks: [ { title: "Mix" }, { title: "" } ])
    assert_no_difference -> { Folder.count } do
      create_folder({ name: "Debut", kind: "project", project_type: "music_release" }, template: template)
    end
    assert_response :unprocessable_entity
    assert_match(/needs a title/, response.parsed_body["errors"].join)
    assert_equal 0, Document.count
  end

  test "the project and its template are saved together or not at all" do
    failing = ->(*, **) { raise ActiveRecord::RecordInvalid, Task.new.tap(&:valid?) }

    ProjectTemplate.stub(:apply, failing) do
      assert_no_difference -> { Folder.count } do
        create_folder({ name: "Debut", kind: "project" }, template: release_template)
      end
    end
    assert_response :unprocessable_entity
    assert_match(/Title can't be blank/, response.parsed_body["errors"].join)
  end

  test "only a project can start from a template" do
    create_folder({ name: "Plain" }, template: release_template)
    assert_response :unprocessable_entity
    assert_match(/Only a project/, response.parsed_body["errors"].join)
  end

  test "a saved type starts a project with its own template when none is sent" do
    source = @space.folders.create!(name: "Album", kind: :project)
    source.documents.create!(title: "Song", created_by: @user)
    @space.tasks.create!(title: "Record", folder: source)
    post "/api/v1/project_types", params: { project_type: { name: "Release", from_folder_id: source.id } }, headers: @headers, as: :json
    key = response.parsed_body["key"]

    create_folder({ name: "Second album", kind: "project", project_type: key })
    assert_response :created

    project = Folder.find(response.parsed_body["id"])
    assert_equal key, project.project_type
    assert_equal [ "Song" ], project.documents.map(&:title)
    assert_equal [ "Record" ], @space.tasks.where(folder_id: project.id).pluck(:title)
  end

  test "a project's type can be changed later without adding anything" do
    project = @space.folders.create!(name: "Album", kind: :project)

    patch "/api/v1/folders/#{project.id}", params: { folder: { project_type: "music_release" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "music_release", response.parsed_body["project_type"]
    assert_equal 0, project.documents.count

    patch "/api/v1/folders/#{project.id}", params: { folder: { project_type: "bogus" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end
end
