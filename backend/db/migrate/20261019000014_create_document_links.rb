# Which documents link to which, rebuilt from a document's content each time
# it is saved, so a document can list the documents that link to it.
class CreateDocumentLinks < ActiveRecord::Migration[7.2]
  def change
    create_table :document_links do |t|
      t.references :source_document, null: false, foreign_key: { to_table: :documents }
      t.references :target_document, null: false, foreign_key: { to_table: :documents }
      t.index %i[source_document_id target_document_id], unique: true, name: "index_document_links_on_source_and_target"
    end
  end
end
