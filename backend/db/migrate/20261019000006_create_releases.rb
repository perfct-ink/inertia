# A release (single, EP, album, music video) with a date, the documents (songs)
# it contains, and through them its tasks. A document can be in several releases.
class CreateReleases < ActiveRecord::Migration[7.2]
  def change
    create_table :releases do |t|
      t.references :workspace, null: false, foreign_key: true
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
