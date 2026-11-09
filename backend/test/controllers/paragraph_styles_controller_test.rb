require "test_helper"

class ParagraphStylesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @pat = User.create!(name: "Pat", email: "styles-pat@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "styles-sam@example.com", password: "password123")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  test "signing in is required" do
    get "/api/v1/paragraph_styles"
    assert_response :unauthorized
    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Callout" } }, as: :json
    assert_response :unauthorized
  end

  test "a person creates a style from a built-in base and some formatting" do
    post "/api/v1/paragraph_styles",
         params: { paragraph_style: { name: "Callout", base: "quote", properties: { size: 20, color: "#2563eb", align: "center" } } },
         headers: headers_for(@pat), as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal "Callout", body["name"]
    assert_equal "quote", body["base"]
    assert_equal({ "size" => 20, "color" => "#2563eb", "align" => "center" }, body["properties"])
    assert_equal [ body["id"] ], @pat.paragraph_styles.pluck(:id)
  end

  test "the base defaults to body and the formatting to none" do
    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Plain" } }, headers: headers_for(@pat), as: :json
    assert_response :created
    assert_equal "body", response.parsed_body["base"]
    assert_equal({}, response.parsed_body["properties"])
  end

  test "the list is the person's own, oldest first, whichever Space is active" do
    first = @pat.paragraph_styles.create!(name: "First", base: "body")
    second = @pat.paragraph_styles.create!(name: "Second", base: "caption")
    @sam.paragraph_styles.create!(name: "Sam's", base: "body")

    get "/api/v1/paragraph_styles", headers: headers_for(@pat).merge("X-Workspace-Id" => @sam.workspace.id.to_s)
    assert_response :success
    assert_equal [ first.id, second.id ], response.parsed_body.map { |s| s["id"] }
  end

  test "a style that breaks a rule is rejected with the reason" do
    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Quote" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Name is already the name of a built-in style"

    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Big", properties: { size: 500 } } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Size is not a valid value"

    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity

    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Odd", base: "heading1" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    assert_equal 0, @pat.paragraph_styles.count
  end

  test "a duplicate name is rejected for the same person only" do
    @pat.paragraph_styles.create!(name: "Callout", base: "body")
    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "callout" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity

    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Callout" } }, headers: headers_for(@sam), as: :json
    assert_response :created
  end

  test "formatting the model does not know is ignored, not stored" do
    post "/api/v1/paragraph_styles", params: { paragraph_style: { name: "Odd", properties: { align: "left", shadow: "1px 1px red" } } }, headers: headers_for(@pat), as: :json
    assert_response :created
    assert_equal({ "align" => "left" }, response.parsed_body["properties"])
  end

  test "signing in is required to change a style" do
    style = @pat.paragraph_styles.create!(name: "Callout", base: "quote")
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { name: "Renamed" } }, as: :json
    assert_response :unauthorized
    delete "/api/v1/paragraph_styles/#{style.id}"
    assert_response :unauthorized
    assert_equal "Callout", style.reload.name
  end

  test "a person edits the name, base and formatting of their style" do
    style = @pat.paragraph_styles.create!(name: "Callout", base: "quote", properties: { size: 20, color: "#2563eb" })
    patch "/api/v1/paragraph_styles/#{style.id}",
          params: { paragraph_style: { name: "Big callout", base: "caption", properties: { size: 28 } } },
          headers: headers_for(@pat), as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal [ style.id, "Big callout", "caption", { "size" => 28 } ], [ body["id"], body["name"], body["base"], body["properties"] ]
    assert_equal({ "size" => 28 }, style.reload.properties)
  end

  test "all the formatting can be cleared in an edit" do
    style = @pat.paragraph_styles.create!(name: "Callout", base: "quote", properties: { size: 20 })
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { properties: {} } }, headers: headers_for(@pat), as: :json
    assert_response :success
    assert_equal({}, style.reload.properties)
  end

  test "an edit that breaks a rule is rejected with the reason and changes nothing" do
    style = @pat.paragraph_styles.create!(name: "Callout", base: "quote", properties: { size: 20 })
    @pat.paragraph_styles.create!(name: "Other", base: "body")

    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { name: "other" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { name: "Title" } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { properties: { size: 500 } } }, headers: headers_for(@pat), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Size is not a valid value"
    assert_equal [ "Callout", { "size" => 20 } ], [ style.reload.name, style.properties ]
  end

  test "a style can be renamed to a different case of its own name" do
    style = @pat.paragraph_styles.create!(name: "callout", base: "quote")
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { name: "Callout" } }, headers: headers_for(@pat), as: :json
    assert_response :success
    assert_equal "Callout", style.reload.name
  end

  test "a person deletes their style" do
    style = @pat.paragraph_styles.create!(name: "Callout", base: "quote")
    assert_difference -> { @pat.paragraph_styles.count }, -1 do
      delete "/api/v1/paragraph_styles/#{style.id}", headers: headers_for(@pat)
    end
    assert_response :no_content
  end

  test "someone else's style can be neither edited nor deleted" do
    style = @sam.paragraph_styles.create!(name: "Sam's", base: "quote")
    patch "/api/v1/paragraph_styles/#{style.id}", params: { paragraph_style: { name: "Mine now" } }, headers: headers_for(@pat), as: :json
    assert_response :not_found
    assert_no_difference -> { ParagraphStyle.count } do
      delete "/api/v1/paragraph_styles/#{style.id}", headers: headers_for(@pat)
    end
    assert_response :not_found
    assert_equal "Sam's", style.reload.name
  end

  test "a style that does not exist is a 404" do
    delete "/api/v1/paragraph_styles/0", headers: headers_for(@pat)
    assert_response :not_found
  end
end
