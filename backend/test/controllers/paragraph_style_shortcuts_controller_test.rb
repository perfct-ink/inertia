require "test_helper"

class ParagraphStyleShortcutsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @pat = User.create!(name: "Pat", email: "keys-pat@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "keys-sam@example.com", password: "password123")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def put_keys(style, keys, user: @pat)
    put "/api/v1/paragraph_style_shortcuts/#{style}", params: { paragraph_style_shortcut: { keys: keys } }, headers: headers_for(user), as: :json
  end

  test "signing in is required" do
    get "/api/v1/paragraph_style_shortcuts"
    assert_response :unauthorized
    put "/api/v1/paragraph_style_shortcuts/quote", params: { paragraph_style_shortcut: { keys: "Ctrl-Mod-1" } }, as: :json
    assert_response :unauthorized
  end

  test "a person sets, changes and lists their keystrokes" do
    put_keys("quote", "Ctrl-Mod-1")
    assert_response :success
    assert_equal({ "style" => "quote", "keys" => "Ctrl-Mod-1" }, response.parsed_body)
    put_keys("quote", "Ctrl-Mod-2")
    assert_response :success
    assert_equal [ "Ctrl-Mod-2" ], @pat.paragraph_style_shortcuts.pluck(:keys)

    get "/api/v1/paragraph_style_shortcuts", headers: headers_for(@pat)
    assert_equal [ { "style" => "quote", "keys" => "Ctrl-Mod-2" } ], response.parsed_body
  end

  test "a custom style takes a keystroke by its key" do
    style = @pat.paragraph_styles.create!(name: "Callout")
    put_keys("custom-#{style.id}", "Ctrl-Mod-3")
    assert_response :success
    assert_equal "custom-#{style.id}", response.parsed_body["style"]
  end

  test "a bad keystroke, an unknown style or a taken keystroke is a 422 with errors" do
    put_keys("quote", "Enter")
    assert_response :unprocessable_entity
    assert response.parsed_body["errors"].any?
    put_keys("headline", "Ctrl-Mod-1")
    assert_response :unprocessable_entity
    put_keys("title", "Ctrl-Mod-1")
    assert_response :success
    put_keys("quote", "Ctrl-Mod-1")
    assert_response :unprocessable_entity
  end

  test "keystrokes are private to the person" do
    put_keys("quote", "Ctrl-Mod-1")
    get "/api/v1/paragraph_style_shortcuts", headers: headers_for(@sam)
    assert_equal [], response.parsed_body
    delete "/api/v1/paragraph_style_shortcuts/quote", headers: headers_for(@sam)
    assert_response :not_found
    assert_equal 1, @pat.paragraph_style_shortcuts.count
  end

  test "removing a keystroke" do
    put_keys("quote", "Ctrl-Mod-1")
    delete "/api/v1/paragraph_style_shortcuts/quote", headers: headers_for(@pat)
    assert_response :no_content
    assert_equal 0, @pat.paragraph_style_shortcuts.count
  end
end
