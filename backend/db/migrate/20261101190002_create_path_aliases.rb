# Hierarchical URLs: the addresses a folder or document used to have, kept so
# old links redirect to the item's current path after a rename or move. See
# PathAlias. target is polymorphic (Folder or Document) and has no foreign key;
# the models delete their aliases when they are destroyed.
class CreatePathAliases < ActiveRecord::Migration[7.2]
  def change
    create_table :path_aliases do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :path, null: false
      t.references :target, polymorphic: true, null: false
      t.timestamps
    end
    add_index :path_aliases, [ :workspace_id, :path ], unique: true
  end
end
