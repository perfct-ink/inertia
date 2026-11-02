# How many hours a person can work in a week in one Space. Resource planning
# compares the hours allocated to them against this; 40 is a full-time week.
class AddWeeklyCapacityToWorkspaceMemberships < ActiveRecord::Migration[7.2]
  def change
    add_column :workspace_memberships, :weekly_capacity_hours, :decimal, precision: 5, scale: 2, default: 40, null: false
  end
end
