# A document can name one initiative; its tasks roll up to it.
class AddInitiativeToDocuments < ActiveRecord::Migration[7.2]
  def change
    add_reference :documents, :initiative, foreign_key: { on_delete: :nullify }
  end
end
