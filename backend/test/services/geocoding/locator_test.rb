require "test_helper"
require_relative "../../support/fake_geocoder"

class GeocodingLocatorTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "locator@example.com", password: "password123")
    @workspace = @user.workspace
    @table = @workspace.folders.create!(name: "Places").documents.create!(title: "Venues", doc_type: :table, created_by: @user)
    @field = @table.table_fields.create!(name: "Address", data_type: "text", geocode: true)
    @geocoder = FakeGeocoder.new("eiffel tower, paris" => FakeGeocoder.place(48.8583, 2.2945, "Eiffel Tower, Paris"))
  end

  def cell_with(text, field: @field)
    @table.table_records.create!.table_cells.create!(table_field: field, value: text)
  end

  def locate(*cells, provider: @geocoder)
    Geocoding::Locator.new(provider: provider).call(cells)
    cells.map { |cell| cell.reload.geocode }
  end

  test "stores latitude, longitude and the matched name beside the typed text" do
    cell = cell_with("Eiffel  Tower, Paris")
    assert_equal [ { "status" => "found", "latitude" => 48.8583, "longitude" => 2.2945, "name" => "Eiffel Tower, Paris" } ], locate(cell)
    assert_equal "Eiffel  Tower, Paris", cell.value
    assert_equal [ "eiffel tower, paris" ], @geocoder.queries
  end

  test "the same text is looked up once per Space, however it is spaced or capitalised" do
    first = cell_with("Eiffel Tower, Paris")
    second = cell_with("  eiffel TOWER,   Paris ")
    locate(first, second)
    assert_equal 1, @geocoder.queries.size
    assert_equal 1, GeocodedPlace.where(workspace: @workspace).count
    assert_equal first.reload.geocode, second.reload.geocode
    locate(cell_with("Eiffel Tower, Paris"))
    assert_equal 1, @geocoder.queries.size
  end

  test "another Space does not share the cache" do
    other = User.create!(name: "Other", email: "locator-other@example.com", password: "password123")
    table = other.workspace.folders.create!(name: "Places").documents.create!(title: "Venues", doc_type: :table, created_by: other)
    field = table.table_fields.create!(name: "Address", data_type: "text", geocode: true)
    locate(cell_with("Eiffel Tower, Paris"))
    locate(table.table_records.create!.table_cells.create!(table_field: field, value: "Eiffel Tower, Paris"))
    assert_equal 2, @geocoder.queries.size
  end

  test "a text with no match is remembered as not found" do
    cell = cell_with("Nowhereville")
    assert_equal [ { "status" => "not_found" } ], locate(cell)
    locate(cell_with("nowhereville"))
    assert_equal [ "nowhereville" ], @geocoder.queries
    assert_not GeocodedPlace.find_by!(query: "nowhereville").found?
  end

  test "a failed lookup is recorded on the cell, keeps the text and is not cached" do
    message = "The place search is not available right now. Edit the text to try again."
    cell = cell_with("Eiffel Tower, Paris")
    assert_equal [ { "status" => "failed", "error" => message } ], locate(cell, provider: FakeGeocoder.new(error: message))
    assert_equal "Eiffel Tower, Paris", cell.value
    assert_equal 0, GeocodedPlace.count
    assert_equal [ "found" ], locate(cell).map { |geocode| geocode["status"] }
  end

  test "coordinates, other fields, blank and very long text are never sent" do
    plain = @table.table_fields.create!(name: "Notes", data_type: "text")
    cells = [ cell_with("48.8584, 2.2945"), cell_with("(48.8584; 2.2945)"), cell_with("Eiffel Tower, Paris", field: plain), cell_with(" "), cell_with("x" * 301) ]
    results = locate(*cells)
    assert_empty @geocoder.queries
    assert_equal [ nil, nil, nil, nil, { "status" => "not_found" } ], results
  end

  test "nothing is sent when no provider is configured" do
    cell = cell_with("Eiffel Tower, Paris")
    Net::HTTP.stub(:new, ->(*) { flunk "the network was used" }) do
      assert_equal [ nil ], locate(cell, provider: Geocoding::NullProvider.new)
    end
  end

  test "an answer for text that was edited meanwhile is dropped" do
    cell = cell_with("Eiffel Tower, Paris")
    stale = FakeGeocoder.new("eiffel tower, paris" => FakeGeocoder.place(1, 2, "Old"))
    stale.define_singleton_method(:lookup) do |query|
      cell.update!(value: "Louvre, Paris")
      super(query)
    end
    assert_equal [ nil ], locate(cell, provider: stale)
  end

  test "a place already found is not looked up again until the text changes" do
    cell = cell_with("Eiffel Tower, Paris")
    locate(cell)
    GeocodedPlace.delete_all
    locate(cell)
    assert_equal 1, @geocoder.queries.size
  end
end
