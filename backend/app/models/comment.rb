# A comment ("Update") on a task, epic, initiative or milestone, with one level
# of replies and @mentions of the Space's members. `commentable` is
# polymorphic: add a type to COMMENTABLES (and include Commentable in its
# model) to let another kind of item carry comments.
class Comment < ApplicationRecord
  # commentable_type => the Workspace association that scopes its lookup.
  # The controller resolves items through this list, never from a raw class name.
  COMMENTABLES = {
    "Task" => :tasks,
    "Epic" => :epics,
    "Initiative" => :initiatives,
    "Milestone" => :milestones
  }.freeze
  MAX_BODY_LENGTH = 5_000
  MENTION_KIND = "comment_mention".freeze
  MENTION_PREVIEW_LENGTH = 140

  belongs_to :workspace
  belongs_to :commentable, polymorphic: true
  # Optional only because deleting a user nullifies their comments; new ones need an author.
  belongs_to :author, class_name: "User", optional: true
  belongs_to :parent, class_name: "Comment", optional: true, inverse_of: :replies
  has_many :replies, -> { order(:created_at, :id) }, class_name: "Comment", foreign_key: :parent_id, dependent: :destroy, inverse_of: :parent
  has_many :mentions, class_name: "CommentMention", dependent: :delete_all
  has_many :mentioned_users, through: :mentions, source: :user

  before_validation :strip_body
  before_validation :reply_to_the_thread, on: :create

  validates :body, presence: true, length: { maximum: MAX_BODY_LENGTH }
  validates :commentable_type, inclusion: { in: COMMENTABLES.keys }
  validates :author, presence: true, on: :create
  validate :commentable_in_same_workspace
  validate :author_belongs_to_workspace, on: :create
  validate :parent_is_on_the_same_item

  before_update :stamp_edit, if: :body_changed?

  # Saves the comment together with its mentions. Only people who can open the
  # Space (members, and people on its teams) and still named ("@Name") in the
  # body count, so editing the text can drop a mention. Each newly mentioned
  # person gets an inbox notification (an edit does not notify twice). All or
  # nothing: a failed save keeps the old mentions and notifies nobody.
  def save_with_mentions(user_ids)
    saved = false
    already_mentioned = persisted? ? mentioned_user_ids : []
    transaction do
      assign_mentions(user_ids)
      saved = save
      raise ActiveRecord::Rollback unless saved
      notify_mentioned(mentioned_users.reject { |user| already_mentioned.include?(user.id) })
    end
    mentioned_users.reset unless saved
    saved
  end

  private

  def assign_mentions(user_ids)
    people = User.where(id: workspace.person_ids & Array(user_ids).map(&:to_i)).to_a
    self.mentioned_users = people.select { |user| named_in_body?(user) }
  end

  # "@Pat Smith" counts at the start of a word, not inside an email address or word.
  def named_in_body?(user)
    body.to_s.match?(/(?<![[:word:]@])@#{Regexp.escape(user.name)}(?![[:word:]])/i)
  end

  def notify_mentioned(people)
    people.each do |person|
      Notification.notify(
        recipient: person, workspace: workspace, kind: MENTION_KIND, subject: commentable, actor: author,
        title: "#{author&.name || 'Someone'} mentioned you on “#{commentable.title}”", body: body.truncate(MENTION_PREVIEW_LENGTH)
      )
    end
  end

  def strip_body
    self.body = body.strip if body
  end

  # Replies hang off the top-level comment: answering a reply answers its thread.
  def reply_to_the_thread
    self.parent = parent.parent if parent&.parent
  end

  def stamp_edit
    self.edited_at = Time.current
  end

  def commentable_in_same_workspace
    return unless COMMENTABLES.key?(commentable_type) && commentable
    errors.add(:commentable, "must belong to the same Space") unless commentable.workspace_id == workspace_id
  end

  def author_belongs_to_workspace
    return if author.nil? || workspace.nil?
    errors.add(:author, "must be a member of the Space") unless workspace.accessible_by?(author_id)
  end

  def parent_is_on_the_same_item
    return unless parent
    return if parent.commentable_type == commentable_type && parent.commentable_id == commentable_id
    errors.add(:parent, "must be a comment on the same item")
  end
end
