# A baseline is a named snapshot of a folder's planned task dates, kept so the
# Gantt can show planned against actual.
class CreateBaselines < ActiveRecord::Migration[7.2]
  def change
    create_table :baselines do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :folder, null: false, foreign_key: true
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :name, null: false
      t.timestamps
    end

    create_table :baseline_tasks do |t|
      t.references :baseline, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: true
      t.date :start_date
      t.date :due_date, null: false
      t.index %i[baseline_id task_id], unique: true
    end
  end
end
