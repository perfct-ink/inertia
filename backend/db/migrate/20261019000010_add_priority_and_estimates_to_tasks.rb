# Priority, an effort estimate in hours, and story points (estimated and actual).
class AddPriorityAndEstimatesToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :priority, :integer, null: false, default: 0
    add_column :tasks, :estimate_hours, :decimal, precision: 7, scale: 2
    add_column :tasks, :story_points, :integer
    add_column :tasks, :actual_story_points, :integer
  end
end
