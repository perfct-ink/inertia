require "test_helper"

class DocumentParagraphStylesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @pat = User.create!(name: "Pat", email: "doc-styles-pat@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "doc-styles-sam@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @pat)
    @space.memberships.create!(user: @sam, role: :member)
    @callout = @pat.paragraph_styles.create!(name: "Callout", base: "quote", properties: { size: 20 })
    @unused = @pat.paragraph_styles.create!(name: "Unused", base: "body")
    @document = @space.root_folder.documents.create!(title: "Plan", created_by: @pat, content: content_using(@callout))
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def content_using(*styles)
    { "type" => "doc", "content" => styles.map { |s| { "type" => "paragraph", "attrs" => { "style" => "custom-#{s.id}" } } } }
  end

  def styles_of(document, user)
    get "/api/v1/documents/#{document.id}/paragraph_styles", headers: headers_for(user)
  end

  test "signing in is required" do
    get "/api/v1/documents/#{@document.id}/paragraph_styles"
    assert_response :unauthorized
  end

  test "someone who can open the document reads the styles it uses, though they are another person's" do
    styles_of(@document, @sam)
    assert_response :success
    assert_equal [ @callout.id ], response.parsed_body.map { |s| s["id"] }
    assert_equal({ "size" => 20 }, response.parsed_body.first["properties"])
    assert_equal "quote", response.parsed_body.first["base"]
  end

  test "a style the document does not use stays private" do
    styles_of(@document, @sam)
    assert_not_includes response.parsed_body.map { |s| s["id"] }, @unused.id
  end

  test "a document that uses no custom style lists none" do
    plain = @space.root_folder.documents.create!(title: "Plain", created_by: @pat, content: { "type" => "doc", "content" => [ { "type" => "paragraph" } ] })
    styles_of(plain, @sam)
    assert_response :success
    assert_equal [], response.parsed_body
  end

  test "an unknown id in the document is left out" do
    @document.update!(content: content_using(@callout, ParagraphStyle.new(id: 999_999)))
    styles_of(@document, @sam)
    assert_equal [ @callout.id ], response.parsed_body.map { |s| s["id"] }
  end

  test "a person who cannot open the document gets a 404 and no styles" do
    outsider = User.create!(name: "Out", email: "doc-styles-out@example.com", password: "password123")
    styles_of(@document, outsider)
    assert_response :not_found
  end

  test "the author's own list still shows only their own styles" do
    get "/api/v1/paragraph_styles", headers: headers_for(@sam)
    assert_response :success
    assert_equal [], response.parsed_body
  end
end
