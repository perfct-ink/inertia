require "test_helper"

class TableGeocodeTest < ActiveSupport::TestCase
  PLACE = { "status" => "found", "latitude" => 48.8583, "longitude" => 2.2945, "name" => "Eiffel Tower, Paris" }.freeze

  setup do
    @user = User.create!(name: "Ada", email: "table-geocode-model@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Places")
    @table = @folder.documents.create!(title: "Venues", doc_type: :table, created_by: @user)
    @address = @table.table_fields.create!(name: "Address", data_type: "text", geocode: true)
    @record = @table.table_records.create!
  end

  test "looking up places is off by default and only for text fields" do
    assert_not @table.table_fields.create!(name: "Notes", data_type: "text").geocode?
    %w[integer number boolean date datetime file files].each do |type|
      field = @table.table_fields.build(name: type, data_type: type, geocode: true)
      field.valid?
      assert field.errors[:geocode].any?, "#{type} accepted geocode"
    end
    assert @table.table_fields.build(name: "Where", data_type: "text", geocode: true).valid?
  end

  test "a place is kept with its text but dropped when the text changes" do
    cell = @record.table_cells.create!(table_field: @address, value: "Eiffel Tower, Paris", geocode: PLACE)
    assert_equal PLACE, cell.reload.geocode
    cell.update!(value: "Eiffel Tower, Paris")
    assert_equal PLACE, cell.reload.geocode
    cell.update!(value: "Louvre, Paris")
    assert_nil cell.reload.geocode
  end

  test "a new place can be stored together with a new text" do
    cell = @record.table_cells.create!(table_field: @address, value: "Old")
    cell.update!(value: "Eiffel Tower, Paris", geocode: PLACE)
    assert_equal PLACE, cell.reload.geocode
  end

  test "turning the lookup off clears the places of that field only" do
    other = @table.table_fields.create!(name: "Home", data_type: "text", geocode: true)
    here = @record.table_cells.create!(table_field: @address, value: "Eiffel Tower, Paris", geocode: PLACE)
    there = @record.table_cells.create!(table_field: other, value: "Eiffel Tower, Paris", geocode: PLACE)
    @address.update!(geocode: false)
    assert_nil here.reload.geocode
    assert_equal "Eiffel Tower, Paris", here.value
    assert_equal PLACE, there.reload.geocode
  end

  test "copying a Collection to another Space keeps the lookup setting and the places" do
    @record.table_cells.create!(table_field: @address, value: "Eiffel Tower, Paris", geocode: PLACE)
    team = Workspace.create!(name: "Team", user: @user)

    copy = SpaceTransfer.new(user: @user, target_folder: team.root_folder).copy_document(@table)

    assert copy.table_fields.sole.geocode?
    assert_equal PLACE, TableCell.joins(:table_record).where(table_records: { document_id: copy.id }).sole.geocode
  end

  test "a Space's remembered lookups go with the Space" do
    team = Workspace.create!(name: "Team", user: @user)
    team.geocoded_places.create!(provider: "fake", query: "paris", latitude: 48.85, longitude: 2.35, display_name: "Paris")
    assert_difference("GeocodedPlace.count", -1) { team.destroy! }
  end
end
