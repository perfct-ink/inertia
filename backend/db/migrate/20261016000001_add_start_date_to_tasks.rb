class AddStartDateToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :start_date, :date
  end
end
