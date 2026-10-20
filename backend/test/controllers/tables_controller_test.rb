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

  test "a many relation holds a list of records, replaces it, clears it and protects linked records" do
    songs = @folder.documents.create!(title: "Songs", doc_type: :table, created_by: @user)
    one = songs.table_records.create!
    two = songs.table_records.create!
    field = @table.table_fields.create!(name: "Songs", data_type: "relation", relation_table: songs, allow_many: true)
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { field.id.to_s => [ one.id, two.id ] } } }, as: :json
    assert_response :success
    row = response.parsed_body["records"].first
    assert_equal [ one.id, two.id ], row["values"][field.id.to_s]
    assert response.parsed_body["fields"].find { |f| f["id"] == field.id }["allow_many"]

    delete "/api/v1/tables/#{songs.id}/records/#{one.id}"
    assert_response :unprocessable_entity

    patch "/api/v1/tables/#{@table.id}/records/#{row['id']}", params: { record: { values: { field.id.to_s => [ two.id ] } } }, as: :json
    assert_equal [ two.id ], response.parsed_body["records"].first["values"][field.id.to_s]
    delete "/api/v1/tables/#{songs.id}/records/#{one.id}"
    assert_response :success

    patch "/api/v1/tables/#{@table.id}/records/#{row['id']}", params: { record: { values: { field.id.to_s => [] } } }, as: :json
    assert_equal({}, response.parsed_body["records"].first["values"])
  end

  test "a many relation rejects records from other collections and a list for a single relation" do
    songs = @folder.documents.create!(title: "Songs", doc_type: :table, created_by: @user)
    many = @table.table_fields.create!(name: "Songs", data_type: "relation", relation_table: songs, allow_many: true)
    single = @table.table_fields.create!(name: "Best song", data_type: "relation", relation_table: songs)
    song = songs.table_records.create!
    stranger = @table.table_records.create!
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { many.id.to_s => [ stranger.id ] } } }, as: :json
    assert_response :not_found
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { single.id.to_s => [ song.id ] } } }, as: :json
    assert_response :unprocessable_entity
  end

  test "allow_many is only for relation fields and cannot change once the field has values" do
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Tags", data_type: "text", allow_many: true } }, as: :json
    assert_response :unprocessable_entity
    songs = @folder.documents.create!(title: "Songs", doc_type: :table, created_by: @user)
    field = @table.table_fields.create!(name: "Song", data_type: "relation", relation_table: songs)
    song = songs.table_records.create!
    post "/api/v1/tables/#{@table.id}/records", params: { record: { values: { field.id.to_s => song.id } } }, as: :json
    patch "/api/v1/tables/#{@table.id}/fields/#{field.id}", params: { field: { allow_many: true } }, as: :json
    assert_response :unprocessable_entity
  end

  test "the related collection lists the records that link to each of its records" do
    albums = @folder.documents.create!(title: "Albums", doc_type: :table, created_by: @user)
    title = albums.table_fields.create!(name: "Title", data_type: "text")
    album = albums.table_records.create!
    other_album = albums.table_records.create!
    songs = @folder.documents.create!(title: "Songs", doc_type: :table, created_by: @user)
    name = songs.table_fields.create!(name: "Name", data_type: "text")
    belongs = songs.table_fields.create!(name: "Album", data_type: "relation", relation_table: albums)
    first = songs.table_records.create!
    first.table_cells.create!(table_field: name, value: "Intro")
    first.table_cells.create!(table_field: belongs, related_record: album)
    second = songs.table_records.create!
    second.table_cells.create!(table_field: belongs, related_record: album)
    third = songs.table_records.create!
    third.table_cells.create!(table_field: belongs, related_record: other_album)
    album.table_cells.create!(table_field: title, value: "Debut")

    get "/api/v1/tables/#{albums.id}"
    assert_response :success
    body = response.parsed_body
    assert_equal [ { "id" => belongs.id, "name" => "Songs", "source_table_id" => songs.id } ], body["reverse_fields"]
    reverse = body["records"].find { |r| r["id"] == album.id }["reverse"][belongs.id.to_s]
    assert_equal [ { "id" => first.id, "label" => "Intro" }, { "id" => second.id, "label" => "##{second.id}" } ], reverse
    assert_equal [ third.id ], body["records"].find { |r| r["id"] == other_album.id }["reverse"][belongs.id.to_s].map { |s| s["id"] }
  end

  test "reverse lists also include songs linked through a many relation" do
    albums = @folder.documents.create!(title: "Albums", doc_type: :table, created_by: @user)
    album = albums.table_records.create!
    songs = @folder.documents.create!(title: "Songs", doc_type: :table, created_by: @user)
    many = songs.table_fields.create!(name: "Albums", data_type: "relation", relation_table: albums, allow_many: true)
    post "/api/v1/tables/#{songs.id}/records", params: { record: { values: { many.id.to_s => [ album.id ] } } }, as: :json
    get "/api/v1/tables/#{albums.id}"
    assert_equal [ songs.table_records.last.id ], response.parsed_body["records"].first["reverse"][many.id.to_s].map { |s| s["id"] }
  end
end
