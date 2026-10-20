# An event made from inside a document points back at it.
class AddDocumentToEvents < ActiveRecord::Migration[7.2]
  def change
    add_reference :events, :document, foreign_key: { on_delete: :nullify }
  end
end
