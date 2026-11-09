require "test_helper"

class TableCsvImportApiTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "true"
    @user = User.first || User.create!(name: "Ada", email: "csv-import-api@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @table = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @name = @table.table_fields.create!(name: "Name", data_type: "text")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "imports rows, creates fields and returns the updated collection" do
    post "/api/v1/tables/#{@table.id}/import", params: {
      columns: [ { field_id: @name.id }, { name: "Age", data_type: "integer" } ],
      rows: [ [ "Ada", 36 ], [ "Bo", "" ] ]
    }, as: :json
    assert_response :success
    age = response.parsed_body["fields"].find { |f| f["name"] == "Age" }
    assert_equal "integer", age["data_type"]
    assert_equal [ { @name.id.to_s => "Ada", age["id"].to_s => 36 }, { @name.id.to_s => "Bo" } ], response.parsed_body["records"].map { |r| r["values"] }
    assert_not_nil @table.reload.content_updated_at
  end

  test "keeps an empty cell in the middle of a row aligned with its column" do
    post "/api/v1/tables/#{@table.id}/import", params: {
      columns: [ { name: "A", data_type: "text" }, { name: "B", data_type: "text" }, { name: "C", data_type: "text" } ],
      rows: [ [ "", "b", "c" ] ]
    }, as: :json
    assert_response :success
    by_name = response.parsed_body["fields"].index_by { |f| f["name"] }
    assert_equal({ by_name["B"]["id"].to_s => "b", by_name["C"]["id"].to_s => "c" }, response.parsed_body["records"].first["values"])
  end

  test "a bad value answers 422 with the row and leaves the collection unchanged" do
    assert_no_difference([ "TableRecord.count", "TableField.count" ]) do
      post "/api/v1/tables/#{@table.id}/import", params: {
        columns: [ { field_id: @name.id }, { name: "Age", data_type: "integer" } ],
        rows: [ [ "Ada", 36 ], [ "Bo", "old" ] ]
      }, as: :json
      assert_response :unprocessable_entity
    end
    assert_match(/Row 3, Age/, response.parsed_body["errors"].first)
  end

  test "malformed bodies answer 422" do
    post "/api/v1/tables/#{@table.id}/import", params: { columns: "Name", rows: [ [ "x" ] ] }, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tables/#{@table.id}/import", params: { columns: [ { field_id: @name.id } ] }, as: :json
    assert_response :unprocessable_entity
  end

  test "a formula column and a field type that cannot be made from a column answer 422" do
    formula = @table.table_fields.create!(name: "Double", data_type: "formula", formula: "{Name} & {Name}")
    assert_no_difference([ "TableRecord.count", "TableField.count" ]) do
      post "/api/v1/tables/#{@table.id}/import", params: { columns: [ { field_id: formula.id } ], rows: [ [ "x" ] ] }, as: :json
      assert_response :unprocessable_entity
      assert_match(/Double is calculated from its formula/, response.parsed_body["errors"].first)
      post "/api/v1/tables/#{@table.id}/import", params: { columns: [ { name: "Link", data_type: "relation" } ], rows: [ [ 1 ] ] }, as: :json
      assert_response :unprocessable_entity
      assert_match(/Column 1 cannot make a relation field/, response.parsed_body["errors"].first)
    end
  end

  test "a viewer of the Space cannot import" do
    ENV["BYPASS_AUTH"] = "false"
    viewer = User.create!(name: "Vi", email: "csv-import-viewer@example.com", password: "password123")
    team = Workspace.create!(name: "Team", user: @user)
    team.memberships.create!(user: viewer, role: :viewer)
    table = team.folders.create!(name: "Shared").documents.create!(title: "Shared", doc_type: :table, created_by: @user)
    token, = Warden::JWTAuth::UserEncoder.new.call(viewer, :user, nil)
    post "/api/v1/tables/#{table.id}/import", params: { columns: [ { name: "A", data_type: "text" } ], rows: [ [ "x" ] ] },
      headers: { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => team.id.to_s }, as: :json
    assert_response :forbidden
    assert_equal 0, table.table_records.count
  end

  test "only members of the Space can import, and only into collections" do
    other = User.create!(name: "Other", email: "csv-import-foreign@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Private")
    foreign = folder.documents.create!(title: "Private", doc_type: :table, created_by: other)
    post "/api/v1/tables/#{foreign.id}/import", params: { columns: [ { name: "A", data_type: "text" } ], rows: [ [ "x" ] ] }, as: :json
    assert_response :not_found
    assert_equal 0, foreign.table_records.count
    document = @folder.documents.create!(title: "Notes", created_by: @user)
    post "/api/v1/tables/#{document.id}/import", params: { columns: [ { name: "A", data_type: "text" } ], rows: [ [ "x" ] ] }, as: :json
    assert_response :not_found
  end
end
