# One answer to "what's the update?" on an ongoing task.
class TaskCheckIn < ApplicationRecord
  belongs_to :task
  belongs_to :author, class_name: "User", optional: true

  validates :body, presence: true

  # Answering clears the open request, so the next one is asked a full interval later.
  after_create { task.update_column(:check_in_requested_at, nil) }

  # Asks the assignee of every ongoing task whose update is due, once per
  # unanswered request (a person is not nagged again until they have checked
  # in). Run on a schedule: `rails check_ins:request`. Returns how many were asked.
  def self.request_due!(now = Time.current)
    asked = 0
    Task.unscoped.where(ongoing: true).where.not(assignee_id: nil).where(check_in_requested_at: nil).find_each do |task|
      next unless task.check_in_stale?(now)
      Notification.notify(
        recipient: task.assignee, workspace: task.workspace, kind: "check_in_requested",
        title: "Update on “#{task.title}”?", body: "It's been #{task.check_in_every_days} days or more since the last update.", subject: task
      )
      task.update_column(:check_in_requested_at, now)
      asked += 1
    end
    asked
  end
end
