require "test_helper"

class CollectionImportsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-import-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Data")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "preview guesses the fields" do
    post "/api/v1/collection_imports/preview", params: { text: '[{"name":"Ada","age":36}]' }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ [ "name", "text" ], [ "age", "integer" ] ], response.parsed_body["fields"].map { |f| [ f["name"], f["data_type"] ] }
  end

  test "creates a new collection with the chosen types" do
    post "/api/v1/collection_imports", params: {
      folder_id: @folder.id, title: "People", text: '[{"name":"Ada","age":36}]',
      fields: [ { name: "name", data_type: "text" }, { name: "age", data_type: "number" } ]
    }, headers: @headers, as: :json
    assert_response :created
    table = Document.find(response.parsed_body["id"])
    assert table.table?
    assert_equal %w[text number], table.table_fields.order(:id).pluck(:data_type)
    assert_equal 1, table.table_records.count
  end

  test "appends to an existing collection" do
    table = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
    post "/api/v1/collection_imports", params: { document_id: table.id, text: "- name: Ada\n" }, headers: @headers, as: :json
    assert_response :created
    assert_equal 1, table.table_records.count
  end

  test "bad text or values return errors and leave nothing behind" do
    post "/api/v1/collection_imports", params: { folder_id: @folder.id, title: "X", text: "not a list" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/collection_imports", params: {
      folder_id: @folder.id, title: "Y", text: '[{"n":"abc"}]', fields: [ { name: "n", data_type: "integer" } ]
    }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal 0, @folder.documents.count
  end

  test "another space's folder is not found" do
    other = User.create!(name: "O", email: "o-import-api@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Theirs")
    post "/api/v1/collection_imports", params: { folder_id: folder.id, title: "X", text: '[{"a":1}]' }, headers: @headers, as: :json
    assert_response :not_found
  end
end
