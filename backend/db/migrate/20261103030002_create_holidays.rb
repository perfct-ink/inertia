# A Space-wide holiday: a named date range (inclusive) that is off for
# everyone in the Space. Resource planning takes its working days off every
# person's weekly capacity.
class CreateHolidays < ActiveRecord::Migration[7.2]
  def change
    create_table :holidays do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.date :start_date, null: false
      t.date :end_date, null: false

      t.timestamps
    end
  end
end
