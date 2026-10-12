class CreateInitiatives < ActiveRecord::Migration[7.2]
  def change
    create_table :initiatives do |t|
      t.string :title, null: false
      t.references :workspace, null: false, foreign_key: true
      t.date :start_date
      t.date :target_date

      t.timestamps
    end
  end
end
