# A folder can name one of its own documents as its home page.
class AddHomeDocumentToFolders < ActiveRecord::Migration[7.2]
  def change
    add_reference :folders, :home_document, foreign_key: { to_table: :documents, on_delete: :nullify }
  end
end
