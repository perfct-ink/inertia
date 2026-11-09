# One status transition of a task: from_status is nil for the creation row.
class TaskStatusChange < ApplicationRecord
  belongs_to :task
  belongs_to :changed_by, class_name: "User", optional: true
  # Set instead of changed_by when an agent made the change (see AgentToken).
  belongs_to :agent_token, optional: true

  enum :from_status, Task.statuses, prefix: :from, validate: { allow_nil: true }
  enum :to_status, Task.statuses, prefix: :to, validate: true
end
