require "test_helper"

class TableMirrorsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "true"
    @user = User.first || User.create!(name: "Ada", email: "table-mirror-api@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @contacts = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @companies = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    @name = @companies.table_fields.create!(name: "Name", data_type: "text")
    @company = @contacts.table_fields.create!(name: "Company", data_type: "relation", relation_table: @companies)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def mirror_params(**overrides)
    { field: { name: "Company name", data_type: "mirror", mirror_relation_field_id: @company.id, mirror_field_id: @name.id }.merge(overrides) }
  end

  test "a mirror field is created through a connect field and shows the linked record's value" do
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params, as: :json
    assert_response :success
    mirror = response.parsed_body["fields"].last
    assert_equal [ "mirror", @company.id, @name.id ], mirror.values_at("data_type", "mirror_relation_field_id", "mirror_field_id")
    assert_nil mirror["relation_table_id"]

    post "/api/v1/tables/#{@companies.id}/records", params: { record: { values: { @name.id.to_s => "Acme" } } }, as: :json
    acme_id = response.parsed_body["records"].first["id"]
    post "/api/v1/tables/#{@contacts.id}/records", params: { record: { values: { @company.id.to_s => acme_id } } }, as: :json
    assert_response :success
    record = response.parsed_body["records"].first
    assert_equal({ @company.id.to_s => acme_id }, record["values"])
    assert_equal({ mirror["id"].to_s => [ "Acme" ] }, record["mirrors"])

    patch "/api/v1/tables/#{@companies.id}/records/#{acme_id}", params: { record: { values: { @name.id.to_s => "Acme Inc" } } }, as: :json
    get "/api/v1/tables/#{@contacts.id}"
    assert_equal [ "Acme Inc" ], response.parsed_body["records"].first["mirrors"][mirror["id"].to_s]
  end

  test "records without a mirror field carry an empty mirrors object" do
    @contacts.table_records.create!
    get "/api/v1/tables/#{@contacts.id}"
    assert_equal({}, response.parsed_body["records"].first["mirrors"])
  end

  test "a mirror needs a connect field here and a value field in the connected collection" do
    nickname = @contacts.table_fields.create!(name: "Nickname", data_type: "text")
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(mirror_relation_field_id: nickname.id), as: :json
    assert_response :unprocessable_entity
    assert_match(/relation field/, response.parsed_body["errors"].join)
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(mirror_field_id: nickname.id), as: :json
    assert_response :unprocessable_entity
    assert_match(/connected collection/, response.parsed_body["errors"].join)
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(mirror_field_id: nil), as: :json
    assert_response :unprocessable_entity
  end

  test "fields from another Space cannot be mirrored" do
    other = User.create!(name: "Other", email: "foreign-mirror-api@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Private")
    table = folder.documents.create!(title: "Private", doc_type: :table, created_by: other)
    secret = table.table_fields.create!(name: "Secret", data_type: "text")
    link = table.table_fields.create!(name: "Self", data_type: "relation", relation_table: table)
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(mirror_field_id: secret.id), as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(mirror_relation_field_id: link.id, mirror_field_id: secret.id), as: :json
    assert_response :unprocessable_entity
  end

  test "a mirror value cannot be written" do
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params, as: :json
    mirror_id = response.parsed_body["fields"].last["id"]
    assert_no_difference("TableRecord.count") do
      post "/api/v1/tables/#{@contacts.id}/records", params: { record: { values: { mirror_id.to_s => "Acme" } } }, as: :json
    end
    assert_response :unprocessable_entity
    assert_match(/mirror/, response.parsed_body["errors"].join)
    post "/api/v1/tables/#{@contacts.id}/records", params: { record: { values: { mirror_id.to_s => nil } } }, as: :json
    assert_response :success
  end

  test "changing a mirror to another type drops its targets and deleting the connect field removes it" do
    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params, as: :json
    mirror_id = response.parsed_body["fields"].last["id"]
    patch "/api/v1/tables/#{@contacts.id}/fields/#{@company.id}", params: { field: { data_type: "text", relation_table_id: nil } }, as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/tables/#{@contacts.id}/fields/#{mirror_id}", params: { field: { data_type: "text" } }, as: :json
    assert_response :success
    changed = response.parsed_body["fields"].find { |field| field["id"] == mirror_id }
    assert_equal [ "text", nil, nil ], changed.values_at("data_type", "mirror_relation_field_id", "mirror_field_id")

    post "/api/v1/tables/#{@contacts.id}/fields", params: mirror_params(name: "Again"), as: :json
    again_id = response.parsed_body["fields"].last["id"]
    delete "/api/v1/tables/#{@contacts.id}/fields/#{@company.id}"
    assert_response :success
    assert_not response.parsed_body["fields"].any? { |field| field["id"] == again_id }
  end
end
