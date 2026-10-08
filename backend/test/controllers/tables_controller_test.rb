require "test_helper"

class TablesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "true"
    @user = User.first || User.create!(name: "Ada", email: "table-api@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @table = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @field = @table.table_fields.create!(name: "Age", data_type: "integer")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "record CRUD preserves values and supports clearing cells" do
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { @field.id.to_s => 0 } } }, as: :json
    assert_response :success
    row = response.parsed_body["records"].first
    assert_equal 0, row["values"][@field.id.to_s]
    patch "/api/v1/tables/#{@table.id}/records/#{row['id']}", params: { record: { values: { @field.id.to_s => nil } } }, as: :json
    assert_response :success
    assert_equal({}, response.parsed_body["records"].first["values"])
    delete "/api/v1/tables/#{@table.id}/records/#{row['id']}"
    assert_response :success
    assert_empty response.parsed_body["records"]
  end

  test "invalid record creation rolls back all values and the record" do
    assert_no_difference("TableRecord.count") do
      post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { @field.id.to_s => "invalid" } } }, as: :json
      assert_response :unprocessable_entity
    end
  end

  test "workspace access applies to tables, fields and records" do
    other = User.create!(name: "Other", email: "foreign-table-api@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Private")
    table = folder.documents.create!(title: "Private", doc_type: :table, created_by: other)
    get "/api/v1/tables/#{table.id}"
    assert_response :not_found
    patch "/api/v1/tables/#{table.id}/fields/#{@field.id}", params: { field: { name: "Oops" } }, as: :json
    assert_response :not_found
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Foreign", data_type: "relation", relation_table_id: table.id } }, as: :json
    assert_response :unprocessable_entity
  end

  test "document and sheet endpoints cannot be used as tables" do
    document = @folder.documents.create!(title: "Notes", created_by: @user)
    get "/api/v1/tables/#{document.id}"
    assert_response :not_found
  end

  test "all three item types can be created in a folder" do
    %w[document spreadsheet table].each do |type|
      post "/api/v1/folders/#{@folder.id}/documents", params: { document: { title: "New #{type}", doc_type: type } }, as: :json
      assert_response :created
      assert_equal type, response.parsed_body["doc_type"]
    end
  end

  test "field CRUD rejects duplicates and incompatible type changes" do
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Name", data_type: "text" } }, as: :json
    assert_response :success
    field_id = response.parsed_body["fields"].last["id"]
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Name", data_type: "text" } }, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { field_id.to_s => "Ada" } } }, as: :json
    assert_response :success
    patch "/api/v1/tables/#{@table.id}/fields/#{field_id}", params: { field: { data_type: "integer" } }, as: :json
    assert_response :unprocessable_entity
    delete "/api/v1/tables/#{@table.id}/fields/#{field_id}"
    assert_response :success
    assert_not TableCell.where(table_field_id: field_id).exists?
  end

  test "relation API scopes linked records and protects referenced deletion" do
    target = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    company = target.table_records.create!
    field = @table.table_fields.create!(name: "Company", data_type: "relation", relation_table: target)
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { field.id.to_s => company.id } } }, as: :json
    assert_response :success
    assert_equal company.id, response.parsed_body["records"].first["values"][field.id.to_s]
    delete "/api/v1/tables/#{target.id}/records/#{company.id}"
    assert_response :unprocessable_entity
    delete "/api/v1/documents/#{target.id}"
    assert_response :unprocessable_entity
    another = @table.table_records.create!
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { field.id.to_s => another.id } } }, as: :json
    assert_response :not_found
  end

  test "folder deletion reports referenced tables and preserves the folder" do
    folder = @user.workspace.folders.create!(name: "Companies")
    target = folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    @table.table_fields.create!(name: "Company", data_type: "relation", relation_table: target)
    delete "/api/v1/folders/#{folder.id}"
    assert_response :unprocessable_entity
    assert Folder.exists?(folder.id)
    assert Document.exists?(target.id)
  end
end
