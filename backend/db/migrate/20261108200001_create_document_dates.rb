# A date picked or typed inside a document (a date chip in the text) is also an
# entry on the calendar. It points back at its document so the calendar can open
# the document at the chip; if the line is deleted the user may keep the entry,
# unlinked (document_id null), and a deleted document leaves its entries behind
# the same way. folder_id files the entry in the project of its document.
class CreateDocumentDates < ActiveRecord::Migration[7.2]
  def change
    create_table :document_dates do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :document, foreign_key: { on_delete: :nullify }
      t.references :folder, foreign_key: { on_delete: :nullify }
      t.date :date, null: false
      t.string :label, null: false, default: ""
      t.timestamps
    end
    add_index :document_dates, %i[workspace_id date]
  end
end
