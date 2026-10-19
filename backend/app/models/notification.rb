# One item in a person's inbox. Create them with Notification.notify so the
# person who caused the event is never notified about their own action.
class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :workspace
  belongs_to :subject, polymorphic: true, optional: true

  validates :kind, :title, presence: true

  scope :unread, -> { where(read_at: nil) }
  scope :newest_first, -> { order(created_at: :desc, id: :desc) }

  # Adds `title` to `recipient`'s inbox in `workspace`, unless the recipient is
  # the actor. Returns the notification, or nil when it was skipped.
  def self.notify(recipient:, workspace:, kind:, title:, body: nil, subject: nil, actor: nil)
    return nil if recipient.nil? || recipient == actor
    create!(user: recipient, workspace: workspace, kind: kind, title: title, body: body, subject: subject)
  end

  def read? = read_at.present?

  def mark_read!
    update!(read_at: Time.current) unless read?
  end
end
