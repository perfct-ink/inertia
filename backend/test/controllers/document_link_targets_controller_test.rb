require "test_helper"

# GET /api/v1/documents/link_targets: the one request that tells the editor
# which linked documents still exist and which headings they have
# (docs/features/heading_links.md).
class DocumentLinkTargetsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Ada", email: "link-targets@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Plans")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def content_with(*headings)
    nodes = headings.map do |text, attrs|
      { "type" => "heading", "attrs" => { "level" => 2 }.merge(attrs || {}), "content" => [ { "type" => "text", "text" => text } ] }
    end
    { "type" => "doc", "content" => nodes }
  end

  def link_targets(ids, user: @user)
    get "/api/v1/documents/link_targets", params: { ids: ids }, headers: headers_for(user)
  end

  test "returns each existing document with its headings in one call" do
    plan = @folder.documents.create!(title: "Plan", created_by: @user, content: content_with([ "Plan", { "level" => 1 } ], [ "Goals", { "id" => "goals" } ]))
    sheet = @folder.documents.create!(title: "Budget", doc_type: :spreadsheet, created_by: @user)

    link_targets("#{plan.id},#{sheet.id}")

    assert_response :success
    by_id = response.parsed_body.index_by { |target| target["id"] }
    assert_equal [ plan.id, sheet.id ].sort, by_id.keys.sort
    assert_equal [ { "id" => nil, "text" => "Plan", "level" => 1 }, { "id" => "goals", "text" => "Goals", "level" => 2 } ], by_id[plan.id]["headings"]
    assert_equal "document", by_id[plan.id]["doc_type"]
    assert_equal [], by_id[sheet.id]["headings"]
  end

  test "a deleted document is left out" do
    kept = @folder.documents.create!(title: "Kept", created_by: @user)
    gone = @folder.documents.create!(title: "Gone", created_by: @user)
    gone.destroy!

    link_targets([ kept.id, gone.id ])

    assert_response :success
    assert_equal [ kept.id ], response.parsed_body.map { |target| target["id"] }
  end

  test "documents in another Space the user belongs to are found, others are not" do
    team = Workspace.create!(name: "Team", user: @user)
    teamwork = team.root_folder.documents.create!(title: "Team plan", created_by: @user)
    stranger = User.create!(name: "Stranger", email: "link-stranger@example.com", password: "password123")
    private_doc = stranger.workspace.root_folder.documents.create!(title: "Private", created_by: stranger)

    link_targets([ teamwork.id, private_doc.id ])

    assert_response :success
    assert_equal [ teamwork.id ], response.parsed_body.map { |target| target["id"] }
  end

  test "no ids, or ids that are not numbers, return an empty list" do
    link_targets(nil)
    assert_response :success
    assert_equal [], response.parsed_body

    link_targets("abc,,-4,0")
    assert_response :success
    assert_equal [], response.parsed_body
  end

  test "requires a signed-in user" do
    get "/api/v1/documents/link_targets", params: { ids: "1" }

    assert_response :unauthorized
  end
end
