class CreateSprints < ActiveRecord::Migration[7.2]
  def change
    create_table :sprints do |t|
      t.string :title, null: false
      t.text :goal
      t.references :workspace, null: false, foreign_key: true
      t.references :owner, foreign_key: { to_table: :users, on_delete: :nullify }
      t.integer :status, null: false, default: 0
      t.date :start_date
      t.date :end_date

      t.timestamps
    end
  end
end
