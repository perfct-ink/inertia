# A form that turns what someone fills in into a task. Its questions live in
# the `questions` JSON column (see TaskFormSchema); every answered form makes
# a task in the Space plus a TaskFormSubmission recording who asked.
#
# Forms are for signed-in Space members. A form can also be opened to anyone
# holding its link, but only when a Space admin turns `public_access` on AND
# the server allows it (PUBLIC_FORMS_ENABLED=true, read in
# config/initializers/public_forms.rb); the link is an unguessable token that
# changes each time public access is switched on.
class TaskForm < ApplicationRecord
  include SameWorkspace

  # Public submissions per form per hour before the form says "try later".
  PUBLIC_HOURLY_LIMIT = 30

  # What filling in a form gives: the submission when it worked, otherwise the
  # reasons it didn't (the form is closed, an answer is wrong, the task is invalid).
  Outcome = Struct.new(:submission, :errors) do
    def ok?
      errors.empty?
    end
  end

  belongs_to :workspace
  belongs_to :epic, optional: true
  belongs_to :folder, optional: true
  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :created_by, class_name: "User", optional: true
  has_many :submissions, class_name: "TaskFormSubmission", dependent: :destroy, inverse_of: :task_form

  validates :title, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 2_000 }
  validates :default_status, inclusion: { in: Task.statuses.keys }
  validates :token, presence: true, uniqueness: true
  validates_same_workspace :epic, :folder
  validate :assignee_belongs_to_workspace
  validate :questions_are_valid
  validate :public_access_is_available, if: -> { public_access_changed?(to: true) }

  before_validation :use_starter_questions, on: :create
  before_validation :normalize_questions
  before_validation :generate_token, on: :create
  before_save :rotate_token_when_made_public, if: -> { public_access_changed?(to: true) && !new_record? }

  # The server-wide switch for public links. Off unless the deployment sets it.
  def self.public_forms_enabled?
    Rails.configuration.x.public_forms_enabled == true
  end

  # Whether the public link currently takes submissions.
  def public_and_open?
    enabled? && public_access? && self.class.public_forms_enabled?
  end

  # Too many anonymous submissions in the last hour.
  def public_throttled?
    submissions.where(submitted_by_id: nil).where(created_at: 1.hour.ago..).count >= PUBLIC_HOURLY_LIMIT
  end

  # Create the task from the answers (question id => text). `user` is who
  # filled it in (nil for a public link).
  def submit(answers, user: nil)
    return Outcome.new(nil, [ "This form is closed" ]) unless enabled?

    parsed = TaskFormSchema.parse(questions, answers)
    return Outcome.new(nil, parsed.errors) if parsed.errors.any?

    task = workspace.tasks.build(parsed.attributes.merge(
      status: default_status, epic_id: epic_id, folder_id: folder_id, assignee_id: assignee_id
    ))
    # Who made it, for the status history and so a person who fills a form in
    # is not notified about the task they just made.
    task.status_changed_by = user
    task.actor = user
    submission = nil
    transaction do
      task.save!
      submission = submissions.create!(task: task, submitted_by: user, answers: parsed.answers)
    end
    Outcome.new(submission, [])
  rescue ActiveRecord::RecordInvalid => e
    Outcome.new(nil, e.record.errors.full_messages)
  end

  private

  def use_starter_questions
    self.questions = TaskFormSchema::STARTER_QUESTIONS.deep_dup if questions.blank?
  end

  def normalize_questions
    self.questions = TaskFormSchema.normalize(questions)
  end

  def generate_token
    self.token = SecureRandom.urlsafe_base64(24) if token.blank?
  end

  # A link that was switched off and on again is a new link, so one that
  # leaked can be retired by toggling public access.
  def rotate_token_when_made_public
    self.token = SecureRandom.urlsafe_base64(24)
  end

  def questions_are_valid
    TaskFormSchema.problems(questions).each { |problem| errors.add(:base, problem) }
  end

  def assignee_belongs_to_workspace
    return if assignee_id.blank? || workspace.nil?
    errors.add(:assignee, "must be a member of the space") unless workspace.memberships.exists?(user_id: assignee_id)
  end

  def public_access_is_available
    errors.add(:public_access, "isn't available on this server") unless self.class.public_forms_enabled?
  end
end
