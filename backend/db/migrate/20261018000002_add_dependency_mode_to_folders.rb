# How a folder's Gantt treats dependency links when a task is rescheduled
# (backlog PM-14): none = ignore, strict = reject a move that breaks a link,
# flexible = shift the tasks that wait on it.
class AddDependencyModeToFolders < ActiveRecord::Migration[7.2]
  def change
    add_column :folders, :dependency_mode, :integer, default: 0, null: false
  end
end
