# A person's planned time on a project (a folder with kind "project"): so many
# hours a week between two dates (no end date means ongoing).
class CreateResourceAllocations < ActiveRecord::Migration[7.2]
  def change
    create_table :resource_allocations do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :folder, null: false, foreign_key: true
      t.decimal :hours_per_week, precision: 5, scale: 2, null: false
      t.date :start_date
      t.date :end_date

      t.timestamps
    end
  end
end
