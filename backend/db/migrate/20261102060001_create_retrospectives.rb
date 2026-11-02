# A retrospective board: a team looks back on a sprint (or any stretch of
# work) in columns chosen by its template, e.g. went well / to improve /
# action items. `template` is fixed when the board is created because its
# cards are filed under that template's column keys (see Retrospective).
class CreateRetrospectives < ActiveRecord::Migration[7.2]
  def change
    create_table :retrospectives do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :sprint, foreign_key: { on_delete: :nullify }
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :title, null: false
      t.string :template, null: false, default: "went_well"

      t.timestamps
    end
  end
end
