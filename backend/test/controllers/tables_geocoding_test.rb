require "test_helper"
require_relative "../support/fake_geocoder"

class TablesGeocodingTest < ActionDispatch::IntegrationTest
  EIFFEL = "Eiffel Tower, Paris"

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    @previous_provider = ENV["GEOCODER_PROVIDER"]
    ENV["BYPASS_AUTH"] = "true"
    ENV.delete("GEOCODER_PROVIDER")
    @user = User.first || User.create!(name: "Ada", email: "table-geocode@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Places")
    @table = @folder.documents.create!(title: "Venues", doc_type: :table, created_by: @user)
    @address = @table.table_fields.create!(name: "Address", data_type: "text", geocode: true)
    @geocoder = FakeGeocoder.new("eiffel tower, paris" => FakeGeocoder.place(48.8583, 2.2945, EIFFEL))
  end

  teardown do
    Geocoding.provider = nil
    ENV["BYPASS_AUTH"] = @previous_bypass
    @previous_provider.nil? ? ENV.delete("GEOCODER_PROVIDER") : ENV["GEOCODER_PROVIDER"] = @previous_provider
  end

  def save_address(text, record_id: nil)
    values = { record: { values: { @address.id.to_s => text } } }
    if record_id
      patch "/api/v1/tables/#{@table.id}/records/#{record_id}", params: values, as: :json
    else
      post "/api/v1/tables/#{@table.id}/records", params: values, as: :json
    end
    assert_response :success
    records = response.parsed_body["records"]
    record_id ? records.find { |record| record["id"] == record_id } : records.max_by { |record| record["id"] }
  end

  test "saving an address with a provider puts the place beside the typed text" do
    Geocoding.provider = @geocoder
    record = save_address(EIFFEL)
    assert_equal EIFFEL, record["values"][@address.id.to_s]
    assert_equal({ "status" => "found", "latitude" => 48.8583, "longitude" => 2.2945, "name" => EIFFEL }, record["places"][@address.id.to_s])
  end

  test "loading the table never looks anything up" do
    Geocoding.provider = @geocoder
    record = save_address(EIFFEL)
    @geocoder.queries.clear
    @table.table_cells.update_all(geocode: nil)
    get "/api/v1/tables/#{@table.id}"
    assert_response :success
    assert_empty @geocoder.queries
    assert_equal({}, response.parsed_body["records"].find { |row| row["id"] == record["id"] }["places"])
  end

  test "without a provider nothing is sent and the Map view behaves as before" do
    Net::HTTP.stub(:new, ->(*) { flunk "the network was used" }) do
      record = save_address(EIFFEL)
      assert_equal EIFFEL, record["values"][@address.id.to_s]
      assert_equal({}, record["places"])
    end
    assert_equal false, response.parsed_body["geocoding"]
  end

  test "the table says whether geocoding is available" do
    get "/api/v1/tables/#{@table.id}"
    assert_equal false, response.parsed_body["geocoding"]
    Geocoding.provider = @geocoder
    get "/api/v1/tables/#{@table.id}"
    assert_equal true, response.parsed_body["geocoding"]
    assert_equal true, response.parsed_body["fields"].first["geocode"]
  end

  test "a failed lookup keeps the text, still saves the record and reports the error on it" do
    Geocoding.provider = FakeGeocoder.new(error: Geocoding::Nominatim::UNAVAILABLE)
    record = save_address(EIFFEL)
    assert_equal EIFFEL, record["values"][@address.id.to_s]
    assert_equal({ "status" => "failed", "error" => Geocoding::Nominatim::UNAVAILABLE }, record["places"][@address.id.to_s])
    assert_equal 1, TableRecord.where(document: @table).count
  end

  test "text that is already coordinates is not looked up" do
    Geocoding.provider = @geocoder
    record = save_address("48.8584, 2.2945")
    assert_empty @geocoder.queries
    assert_equal({}, record["places"])
  end

  test "the same address on two records is looked up once" do
    Geocoding.provider = @geocoder
    save_address(EIFFEL)
    record = save_address("eiffel tower,  paris")
    assert_equal 1, @geocoder.queries.size
    assert_equal "found", record["places"][@address.id.to_s]["status"]
  end

  test "editing the text drops the old place, with or without a provider" do
    Geocoding.provider = @geocoder
    record = save_address(EIFFEL)
    Geocoding.provider = nil
    edited = save_address("Louvre, Paris", record_id: record["id"])
    assert_equal({}, edited["places"])
  end

  test "turning the lookup off removes the places but keeps the text" do
    Geocoding.provider = @geocoder
    record = save_address(EIFFEL)
    patch "/api/v1/tables/#{@table.id}/fields/#{@address.id}", params: { field: { geocode: false } }, as: :json
    assert_response :success
    row = response.parsed_body["records"].find { |candidate| candidate["id"] == record["id"] }
    assert_equal({}, row["places"])
    assert_equal EIFFEL, row["values"][@address.id.to_s]
    assert_equal false, response.parsed_body["fields"].first["geocode"]
  end

  test "only text fields can look up places" do
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Rooms", data_type: "integer", geocode: true } }, as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].join, "text"
    post "/api/v1/tables/#{@table.id}/fields", params: { field: { name: "Where", data_type: "text", geocode: true } }, as: :json
    assert_response :success
    assert_equal true, response.parsed_body["fields"].last["geocode"]
  end
end
