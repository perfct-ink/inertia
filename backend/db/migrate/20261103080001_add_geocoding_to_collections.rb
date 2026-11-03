# Geocoding a Collection's address fields. A text field can opt in
# (table_fields.geocode); the place found for a cell's text is stored beside the
# text (table_cells.geocode: status, latitude, longitude, matched name or error).
# geocoded_places remembers every lookup per Space so the same text is never
# sent to the provider twice.
class AddGeocodingToCollections < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :geocode, :boolean, default: false, null: false
    add_column :table_cells, :geocode, :json

    create_table :geocoded_places do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :query, null: false
      # Both stay empty when the provider found no place for the query.
      t.float :latitude
      t.float :longitude
      t.string :display_name

      t.timestamps
    end
    add_index :geocoded_places, %i[workspace_id provider query], unique: true, name: "index_geocoded_places_on_space_provider_and_query"
  end
end
