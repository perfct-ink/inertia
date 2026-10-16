class CreateMilestones < ActiveRecord::Migration[7.2]
  def change
    create_table :milestones do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :folder, foreign_key: true
      t.references :owner, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :title, null: false
      t.text :description
      t.date :target_date
      # 0 planned, 1 active, 2 done (see PlanningItem)
      t.integer :status, null: false, default: 0
      t.timestamps
    end

    # Every level of the hierarchy can sit under a milestone; a task or epic
    # without its own inherits its epic's / initiative's (see MilestoneRollup).
    add_reference :initiatives, :milestone, foreign_key: true
    add_reference :epics, :milestone, foreign_key: true
    add_reference :tasks, :milestone, foreign_key: true

    add_column :initiatives, :description, :text
    add_column :initiatives, :status, :integer, null: false, default: 0
    add_reference :initiatives, :owner, foreign_key: { to_table: :users, on_delete: :nullify }
  end
end
