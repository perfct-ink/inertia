require "test_helper"
require "minitest/mock"

class SharesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat Secret", email: "pat-secret-shares@example.com", password: "password123")
    @headers = headers_for(@user)
    @space = @user.workspace
    @folder = @space.folders.create!(name: "Plans")
    @document = @folder.documents.create!(
      title: "Launch plan",
      created_by: @user,
      content: { "type" => "doc", "content" => [ { "type" => "heading", "attrs" => { "level" => 1 }, "content" => [ { "type" => "text", "text" => "Launch plan" } ] } ] }
    )
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def share_document(document = @document, share: {})
    post "/api/v1/shares", params: { document_id: document.id, share: share }, headers: @headers, as: :json
  end

  def share_folder(folder = @folder, share: {})
    post "/api/v1/shares", params: { folder_id: folder.id, share: share }, headers: @headers, as: :json
  end

  test "a member makes a view link for a document and lists it" do
    share_document
    assert_response :created
    body = response.parsed_body
    assert_equal "view", body["permission"]
    assert_equal [ "Document", @document.id ], body.values_at("shareable_type", "shareable_id")
    assert_nil body["expires_at"]
    assert_match(/\A[A-Za-z0-9_-]{22}\z/, body["token"])

    get "/api/v1/shares", params: { document_id: @document.id }, headers: @headers
    assert_response :success
    assert_equal [ body["token"] ], response.parsed_body.map { |s| s["token"] }
  end

  test "a link can be made for a folder, with an expiry" do
    freeze_time do
      share_folder(share: { permission: "view", expires_in_days: 7 })
      assert_response :created
      assert_equal 7.days.from_now.iso8601(3), Time.zone.parse(response.parsed_body["expires_at"]).iso8601(3)
    end

    get "/api/v1/shares", params: { folder_id: @folder.id }, headers: @headers
    assert_equal 1, response.parsed_body.size
  end

  test "an expiry that isn't 1 to 365 whole days is rejected" do
    [ "0", "366", "soon", "3.5", "-2" ].each do |days|
      share_document(share: { expires_in_days: days })
      assert_response :unprocessable_entity, "expires_in_days #{days.inspect}"
    end
    assert_equal 0, Share.count
  end

  test "editing through a link is not available: an edit link is refused" do
    share_document(share: { permission: "edit" })
    assert_response :unprocessable_entity
    assert_match(/Editing through a link/, response.parsed_body["errors"].join)

    share_document(share: { permission: "admin" })
    assert_response :unprocessable_entity
    assert_equal 0, Share.count
  end

  test "spreadsheets, Collections and a Space's root folder can't be shared" do
    sheet = @folder.documents.create!(title: "Numbers", doc_type: :spreadsheet, created_by: @user)
    share_document(sheet)
    assert_response :unprocessable_entity

    share_folder(@space.root_folder)
    assert_response :unprocessable_entity
    assert_equal 0, Share.count
  end

  test "someone outside the Space can't make, list, see or revoke its links" do
    share_document
    id = response.parsed_body["id"]
    outsider = User.create!(name: "Out", email: "outsider-shares@example.com", password: "password123")
    theirs = headers_for(outsider)

    post "/api/v1/shares", params: { document_id: @document.id }, headers: theirs, as: :json
    assert_response :not_found
    get "/api/v1/shares", params: { document_id: @document.id }, headers: theirs
    assert_response :not_found
    get "/api/v1/shares/#{id}", headers: theirs
    assert_response :not_found
    delete "/api/v1/shares/#{id}", headers: theirs
    assert_response :not_found
    assert Share.exists?(id)
  end

  test "a viewer in the Space can read it but not hold its link tokens" do
    team = Workspace.create!(name: "Team", user: @user)
    team_doc = team.root_folder.documents.create!(title: "Team plan", created_by: @user)
    viewer = User.create!(name: "View", email: "viewer-shares@example.com", password: "password123")
    team.memberships.create!(user: viewer, role: :viewer)
    link = team_doc.shares.create!(created_by: @user)
    theirs = headers_for(viewer)

    post "/api/v1/shares", params: { document_id: team_doc.id }, headers: theirs, as: :json
    assert_response :forbidden
    get "/api/v1/shares", params: { document_id: team_doc.id }, headers: theirs
    assert_response :forbidden
    get "/api/v1/shares/#{link.id}", headers: theirs
    assert_response :forbidden
    delete "/api/v1/shares/#{link.id}", headers: theirs
    assert_response :forbidden
    assert Share.exists?(link.id)
  end

  test "signed-out requests can't manage links" do
    post "/api/v1/shares", params: { document_id: @document.id }, as: :json
    assert_response :unauthorized
    get "/api/v1/shares", params: { document_id: @document.id }
    assert_response :unauthorized
  end

  test "the roadmap link is not reachable through the shares endpoints" do
    roadmap = @space.shares.create!(permission: :view, created_by: @user)
    get "/api/v1/shares/#{roadmap.id}", headers: @headers
    assert_response :not_found
    delete "/api/v1/shares/#{roadmap.id}", headers: @headers
    assert_response :not_found
    assert Share.exists?(roadmap.id)
  end

  test "anyone with a document link reads it without signing in, and sees no people" do
    share_document
    token = response.parsed_body["token"]

    get "/api/v1/shared/#{token}"

    assert_response :success
    body = response.parsed_body
    assert_equal [ "document", "view" ], body.values_at("kind", "access")
    assert_equal "Launch plan", body["resource"]["document"]["title"]
    assert_equal "doc", body["resource"]["document"]["content"]["type"]
    assert_not_includes response.body, "Pat Secret"
    assert_not_includes response.body, "pat-secret-shares"
    assert_not_includes response.body, "created_by"
    assert_not_includes response.body, token
    assert_not_includes response.body, "workspace"
  end

  test "a signed-in person, even from another Space, opens the same read-only page" do
    share_document
    token = response.parsed_body["token"]
    other = User.create!(name: "Other", email: "other-shares@example.com", password: "password123")

    get "/api/v1/shared/#{token}", headers: headers_for(other)
    assert_response :success
    assert_equal "Launch plan", response.parsed_body["resource"]["document"]["title"]

    get "/api/v1/shared/#{token}", headers: { "Authorization" => "Bearer not-a-real-token" }
    assert_response :success
  end

  test "public responses are never cached, indexed or sent on as a referrer" do
    share_document
    get "/api/v1/shared/#{response.parsed_body['token']}"

    assert_equal "no-store", response.headers["Cache-Control"]
    assert_equal "no-referrer", response.headers["Referrer-Policy"]
    assert_equal "noindex, nofollow", response.headers["X-Robots-Tag"]

    get "/api/v1/shared/unknown-token"
    assert_response :not_found
    assert_equal "no-store", response.headers["Cache-Control"]
  end

  test "an unknown, revoked or expired token is a plain 404" do
    get "/api/v1/shared/does-not-exist"
    assert_response :not_found

    share_document
    token = response.parsed_body["token"]
    id = response.parsed_body["id"]
    delete "/api/v1/shares/#{id}", headers: @headers
    assert_response :no_content
    get "/api/v1/shared/#{token}"
    assert_response :not_found

    share_document(share: { expires_in_days: 1 })
    token = response.parsed_body["token"]
    get "/api/v1/shared/#{token}"
    assert_response :success
    travel 2.days do
      get "/api/v1/shared/#{token}"
      assert_response :not_found
    end
  end

  test "a link to an archived folder, or a document inside one, stops working" do
    share_document
    document_token = response.parsed_body["token"]
    share_folder
    folder_token = response.parsed_body["token"]

    @folder.archive!

    get "/api/v1/shared/#{document_token}"
    assert_response :not_found
    get "/api/v1/shared/#{folder_token}"
    assert_response :not_found
  end

  test "a folder link lists what is inside, and opens only documents inside it" do
    sub = @space.folders.create!(name: "Sub", parent: @folder)
    inside = sub.documents.create!(title: "Inside", created_by: @user)
    outside = @space.folders.create!(name: "Elsewhere").documents.create!(title: "Outside", created_by: @user)
    sheet = @folder.documents.create!(title: "Numbers", doc_type: :spreadsheet, created_by: @user)
    share_folder
    token = response.parsed_body["token"]

    get "/api/v1/shared/#{token}"
    assert_response :success
    resource = response.parsed_body["resource"]
    assert_equal "folder", response.parsed_body["kind"]
    assert_equal "Plans", resource["folder"]["name"]
    assert_equal [ "Sub" ], resource["folders"].map { |f| f["name"] }
    assert_equal [ "Inside", "Launch plan" ], resource["documents"].map { |d| d["title"] }
    assert_not_includes response.body, "content"
    assert_not_includes response.body, "Pat Secret"

    get "/api/v1/shared/#{token}/documents/#{inside.id}"
    assert_response :success
    assert_equal "Inside", response.parsed_body["resource"]["document"]["title"]

    [ outside.id, sheet.id, 0 ].each do |id|
      get "/api/v1/shared/#{token}/documents/#{id}"
      assert_response :not_found, "document #{id}"
    end
  end

  test "a document link opens no other document, and an unknown link opens none" do
    share_document
    token = response.parsed_body["token"]
    other = @folder.documents.create!(title: "Other", created_by: @user)

    get "/api/v1/shared/#{token}/documents/#{other.id}"
    assert_response :not_found
    get "/api/v1/shared/#{token}/documents/#{@document.id}"
    assert_response :not_found
    get "/api/v1/shared/nope/documents/#{other.id}"
    assert_response :not_found
  end

  test "a link made before editing was ruled out still opens view only" do
    share = @document.shares.create!(created_by: @user)
    share.update_column(:permission, Share.permissions[:edit])

    get "/api/v1/shared/#{share.token}"

    assert_response :success
    assert_equal "view", response.parsed_body["access"]
  end

  test "task ids are taken out of the text a link shows" do
    @document.update!(content: { "type" => "doc", "content" => [ { "type" => "workspaceTaskList", "content" => [ { "type" => "workspaceTaskItem", "attrs" => { "taskId" => 987 }, "content" => [ { "type" => "paragraph" } ] } ] } ] })
    share_document

    get "/api/v1/shared/#{response.parsed_body['token']}"

    assert_not_includes response.body, "987"
  end

  test "too many public requests from one address are answered with 429" do
    share_document
    token = response.parsed_body["token"]

    Api::V1::SharesController.cache_store.stub(:increment, 1000) do
      get "/api/v1/shared/#{token}"
      assert_response :too_many_requests
      assert_equal "no-store", response.headers["Cache-Control"]
    end
  end
end
