# Releases was added by accident and removed from the app (Alex, 2026-11-07,
# who chose to drop the tables and their data). Down recreates the empty
# tables so a rollback has them, but the rows are gone.
class DropReleases < ActiveRecord::Migration[7.2]
  def up
    drop_table :release_documents, if_exists: true
    drop_table :releases, if_exists: true
  end

  def down
    create_table :releases do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :folder, foreign_key: { on_delete: :nullify }
      t.string :title, null: false
      t.integer :kind, null: false, default: 0
      t.date :release_date
      t.timestamps
    end

    create_table :release_documents do |t|
      t.references :release, null: false, foreign_key: true
      t.references :document, null: false, foreign_key: true
      t.index %i[release_id document_id], unique: true
    end
  end
end
