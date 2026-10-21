# A user attached to a task as an assignee (does the work) or a watcher
# (follows it). A user can hold both roles on one task.
class TaskParticipant < ApplicationRecord
  belongs_to :task
  belongs_to :user

  enum :role, { assignee: 0, watcher: 1 }, scopes: false

  validates :user_id, uniqueness: { scope: [ :task_id, :role ] }
end
