# A person's leave: a date range (inclusive) with an optional note. Resource
# planning takes the working days in it off that person's weekly capacity.
class CreateTimeOffs < ActiveRecord::Migration[7.2]
  def change
    create_table :time_offs do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.string :note

      t.timestamps
    end
  end
end
