# One check-in on an ongoing task: the owner's status (on track, at risk or
# blocked) and an optional note. Together they form the task's update log.
class TaskCheckIn < ApplicationRecord
  STATUSES = { on_track: 0, at_risk: 1, blocked: 2 }.freeze

  belongs_to :task
  belongs_to :author, class_name: "User", optional: true

  enum :status, STATUSES, prefix: true, scopes: false, validate: true

  before_validation { self.note = note.to_s.strip.presence }
  validate :task_is_ongoing, on: :create

  # Answering restarts the clock for the next check-in, closes the open request
  # and becomes the status shown on the task.
  after_create { task.update_columns(last_check_in_at: created_at, check_in_requested_at: nil, check_in_status: status) }

  # Asks the assignees of every ongoing task whose check-in is due (its day has
  # come), once per unanswered request: nobody is asked again until someone has
  # checked in. Only people who can still open the task's Space are asked. Pass
  # `assignee:` to look at one person's tasks only (what the inbox does when they
  # open it). TaskCheckInRequestJob runs it, for one person or everyone. Returns
  # how many tasks were asked about.
  def self.request_due!(today = Date.current, assignee: nil)
    tasks = Task.unscoped.includes(:workspace, :participants).where(ongoing: true, check_in_requested_at: nil)
    tasks = tasks.where(id: TaskParticipant.where(role: :assignee, user_id: assignee.id).select(:task_id)) if assignee
    asked = 0
    tasks.find_each do |task|
      next unless task.check_in_due?(today)
      recipients = User.where(id: task.assignee_ids).select { |user| task.workspace.accessible_by?(user.id) }
      next if recipients.empty?
      recipients.each do |user|
        Notification.notify(
          recipient: user, workspace: task.workspace, kind: "check_in_requested", subject: task,
          title: "Check in on “#{task.title}”", body: "How is it going? Pick on track, at risk or blocked, and add a note if you like."
        )
      end
      task.update_column(:check_in_requested_at, Time.current)
      asked += 1
    end
    asked
  end

  private

  def task_is_ongoing
    errors.add(:base, "Only an ongoing task takes check-ins") unless task&.ongoing?
  end
end
