# A named set of view choices (sort, grouping, filter, hidden columns) for one
# page, kept by a person and optionally shared with the whole Space.
class CreateSavedViews < ActiveRecord::Migration[7.2]
  def change
    create_table :saved_views do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :page, null: false
      t.string :name, null: false
      t.json :config, null: false
      t.boolean :shared, null: false, default: false
      t.timestamps
    end
    add_index :saved_views, %i[workspace_id page]
  end
end
