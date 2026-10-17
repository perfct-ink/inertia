# OKRs (PM-31): an objective for a period, measured by key results. A key
# result either tracks a number by hand (start -> target, current) or takes
# its progress from a linked initiative's task rollup.
class CreateObjectivesAndKeyResults < ActiveRecord::Migration[7.2]
  def change
    create_table :objectives do |t|
      t.string :title, null: false
      t.text :description
      t.references :workspace, null: false, foreign_key: true
      t.references :owner, foreign_key: { to_table: :users, on_delete: :nullify }
      t.integer :status, null: false, default: 0
      t.date :start_date
      t.date :target_date
      t.timestamps
    end

    create_table :key_results do |t|
      t.references :objective, null: false, foreign_key: true
      t.string :title, null: false
      t.references :initiative, foreign_key: { on_delete: :nullify }
      t.decimal :start_value, precision: 15, scale: 2, null: false, default: 0
      t.decimal :target_value, precision: 15, scale: 2
      t.decimal :current_value, precision: 15, scale: 2, null: false, default: 0
      t.string :unit
      t.integer :position, null: false, default: 0
      t.timestamps
    end
  end
end
