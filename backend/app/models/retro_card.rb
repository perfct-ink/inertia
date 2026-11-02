# One card on a retrospective board, filed under a column of the board's
# template. Any member may vote once per card; only counts are shown (see
# RetroCardBlueprint). A card in the action items column can become a task.
class RetroCard < ApplicationRecord
  MAX_BODY_LENGTH = 1000

  belongs_to :retrospective
  belongs_to :author, class_name: "User", optional: true
  belongs_to :task, optional: true
  has_many :votes, class_name: "RetroVote", dependent: :destroy, inverse_of: :retro_card

  validates :body, presence: true, length: { maximum: MAX_BODY_LENGTH }
  validates :column_key, inclusion: { in: ->(card) { card.retrospective&.columns || [] } }

  def action?
    column_key == Retrospective::ACTION_COLUMN
  end

  def votes_count
    votes.size
  end

  def voted_by?(user_id)
    votes.any? { |vote| vote.user_id == user_id }
  end

  # Turns an action item into a backlog task in `workspace`: the card text on
  # one line (cut to fit a title), with the full text as the description when
  # that adds anything. Returns the task, or nil with the reason in `errors`.
  # The row lock stops two people creating two tasks from the same card.
  def create_task(workspace)
    task = nil
    with_lock do
      if !action?
        errors.add(:base, "Only action items can become tasks")
      elsif task_id?
        errors.add(:base, "This action item already has a task")
      else
        title = body.squish.truncate(255)
        task = workspace.tasks.build(title: title, description: (body unless body == title), status: :backlog)
        if task.save
          update!(task: task)
        else
          task.errors.full_messages.each { |message| errors.add(:base, message) }
          task = nil
        end
      end
    end
    task
  end
end
