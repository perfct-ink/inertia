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

  def post_import(path, params)
    post "/api/v1/collection_imports#{path}", params: params, headers: @headers, as: :json
  end

  test "preview guesses the fields, lists skipped keys and offers the importable types" do
    post_import "/preview", folder_id: @folder.id, text: '[{"name":"Ada","age":36,"tags":["a"]}]'
    assert_response :success
    body = response.parsed_body
    assert_equal [ [ "name", "text" ], [ "age", "integer" ] ], body["columns"].map { |c| [ c["key"], c["data_type"] ] }
    assert_equal [ "tags" ], body["skipped_keys"]
    assert_equal 1, body["row_count"]
    assert_equal CollectionImport.creatable_types, body["types"]
  end

  test "preview of an existing collection shows the matching fields" do
    table = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
    field = table.table_fields.create!(name: "Name", data_type: "text")
    post_import "/preview", document_id: table.id, text: '[{"name":"Ada","age":36}]'
    assert_response :success
    columns = response.parsed_body["columns"]
    assert_equal [ field.id, nil ], columns.map { |c| c["field_id"] }
    assert_equal [ "Name", nil ], columns.map { |c| c["field_name"] }
  end

  test "creates a new collection with the chosen types" do
    post_import "", folder_id: @folder.id, title: "People", text: '[{"name":"Ada","age":36}]',
      columns: [ { key: "name", data_type: "text" }, { key: "age", data_type: "number" } ]
    assert_response :created
    table = Document.find(response.parsed_body["id"])
    assert table.table?
    assert_equal "People", table.title
    assert_equal %w[text number], table.table_fields.order(:id).pluck(:data_type)
    assert_equal 1, table.table_records.count
    assert_equal 1, response.parsed_body["row_count"]
  end

  test "without columns the guesses are used and a blank title gets a default" do
    post_import "", folder_id: @folder.id, title: " ", text: "- name: Ada\n  age: 36\n"
    assert_response :created
    table = Document.find(response.parsed_body["id"])
    assert_equal "Imported collection", table.title
    assert_equal %w[text integer], table.table_fields.order(:id).pluck(:data_type)
  end

  test "appends to an existing collection" do
    table = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
    name = table.table_fields.create!(name: "Name", data_type: "text")
    post_import "", document_id: table.id, text: '[{"name":"Ada"}]', columns: [ { key: "name", data_type: "text" } ]
    assert_response :created
    assert_equal table.id, response.parsed_body["id"]
    assert_equal 1, table.table_records.count
    assert_equal "Ada", table.table_records.first.table_cells.find_by(table_field: name).value
  end

  test "bad text or values return errors and leave nothing behind" do
    post_import "", folder_id: @folder.id, title: "X", text: "not a list"
    assert_response :unprocessable_entity
    post_import "", folder_id: @folder.id, title: "Y", text: '[{"n":"abc"}]', columns: [ { key: "n", data_type: "integer" } ]
    assert_response :unprocessable_entity
    assert_match(/row 1, n/, response.parsed_body["errors"].first)
    assert_equal 0, @folder.documents.count
  end

  test "another space's folder or collection is not found" do
    other = User.create!(name: "O", email: "o-import-api@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Theirs")
    table = folder.documents.create!(title: "Theirs", doc_type: :table, created_by: other)
    post_import "", folder_id: folder.id, title: "X", text: '[{"a":1}]'
    assert_response :not_found
    post_import "", document_id: table.id, text: '[{"a":1}]'
    assert_response :not_found
  end

  test "a viewer in a space cannot import into it" do
    owner = User.create!(name: "Owner", email: "owner-import-api@example.com", password: "password123")
    owner.workspace.memberships.create!(user: @user, role: :viewer)
    folder = owner.workspace.folders.create!(name: "Shared")
    post_import "/preview", folder_id: folder.id, text: '[{"a":1}]'
    assert_response :forbidden
    post_import "", folder_id: folder.id, title: "X", text: '[{"a":1}]'
    assert_response :forbidden
    assert_equal 0, folder.documents.count
  end
end
