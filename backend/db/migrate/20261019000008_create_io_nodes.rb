# Intermediate Objectives Map (Goldratt): one Goal, Critical Success Factors
# under it, Necessary Conditions under those. Nodes can link to an OKR
# objective or an initiative to show its progress.
class CreateIoNodes < ActiveRecord::Migration[7.2]
  def change
    create_table :io_nodes do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :parent, foreign_key: { to_table: :io_nodes }
      t.integer :kind, null: false, default: 0
      t.string :title, null: false
      t.text :description
      t.integer :position, null: false, default: 0
      t.references :objective, foreign_key: { on_delete: :nullify }
      t.references :initiative, foreign_key: { on_delete: :nullify }
      t.timestamps
    end
  end
end
