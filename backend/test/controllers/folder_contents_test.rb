require "test_helper"

class FolderContentsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-folder-contents@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @messages = @workspace.folders.create!(name: "Messages")
    @design = @workspace.folders.create!(name: "Design", parent: @messages, position: 2)
    @mockups = @workspace.folders.create!(name: "Mockups", parent: @design)
    @brief = @messages.documents.create!(title: "Brief", created_by: @user)
    @spec = @design.documents.create!(title: "Spec", created_by: @user)
    @mockup = @mockups.documents.create!(title: "Mockup", created_by: @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def contents(folder = @messages)
    get "/api/v1/folders/#{folder.id}/contents", headers: @headers
    assert_response :success
    response.parsed_body
  end

  test "lists the documents and folders directly inside, one level and not everything nested" do
    body = contents
    assert_equal [ "Brief" ], body["documents"].map { |d| d["title"] }
    assert_equal [ "Design" ], body["folders"].map { |f| f["name"] }
    assert_equal [ "Spec" ], contents(@design)["documents"].map { |d| d["title"] }
    assert_equal [ "Mockups" ], contents(@design)["folders"].map { |f| f["name"] }
  end

  test "a folder with nothing directly inside lists nothing, however much sits below it" do
    empty = @workspace.folders.create!(name: "Empty")
    nested = @workspace.folders.create!(name: "Nested", parent: empty)
    nested.documents.create!(title: "Below", created_by: @user)
    body = contents(empty)
    assert_equal [], body["documents"]
    assert_equal [ "Nested" ], body["folders"].map { |f| f["name"] }
  end

  test "documents are ordered by title and folders by position, then name" do
    @messages.documents.create!(title: "Agenda", created_by: @user)
    @workspace.folders.create!(name: "Zed", parent: @messages, position: 1)
    body = contents
    assert_equal [ "Agenda", "Brief" ], body["documents"].map { |d| d["title"] }
    assert_equal [ "Zed", "Design" ], body["folders"].map { |f| f["name"] }
  end

  test "archived subfolders are left out" do
    @workspace.folders.create!(name: "Old", parent: @messages, archived_at: Time.current)
    assert_equal [ "Design" ], contents["folders"].map { |f| f["name"] }
  end

  test "the folders say whether they are the document root" do
    root_page = contents(@workspace.root_folder)
    assert_includes root_page["folders"].map { |f| f["name"] }, "Messages"
    assert_equal [ false ], root_page["folders"].map { |f| f["root"] }.uniq
  end

  test "tasks and epics still roll up the whole subtree" do
    @workspace.tasks.create!(title: "Direct", folder: @messages)
    @workspace.tasks.create!(title: "Nested", folder: @mockups)
    @workspace.tasks.create!(title: "Through a document", document: @mockup)
    @workspace.epics.create!(title: "Nested epic", folder: @mockups)
    body = contents
    assert_equal [ "Direct", "Nested", "Through a document" ], body["tasks"].map { |t| t["title"] }.sort
    assert_equal [ "Nested epic" ], body["epics"].map { |e| e["title"] }
  end

  test "another space's folder is not found" do
    theirs = User.create!(name: "O", email: "o-folder-contents@example.com", password: "password123").workspace
    folder = theirs.folders.create!(name: "Theirs")
    get "/api/v1/folders/#{folder.id}/contents", headers: @headers
    assert_response :not_found
  end
end
