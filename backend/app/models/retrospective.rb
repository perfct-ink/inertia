# A retrospective board (the Agile "retro"): a team looks back on a sprint, or
# any stretch of work, by putting cards in columns. The template picked when
# the board is created decides the columns, and cannot change afterwards
# because the cards are filed under its column keys. Every template ends with
# an action items column, whose cards can be turned into Space tasks.
#
# Keep TEMPLATES in step with frontend/src/data/retrospective.ts, which holds
# the labels.
class Retrospective < ApplicationRecord
  include ProjectItem

  ACTION_COLUMN = "action_items".freeze
  DEFAULT_TEMPLATE = "went_well".freeze
  TEMPLATES = {
    "went_well" => %w[went_well to_improve action_items],
    "start_stop_continue" => %w[start stop continue action_items],
    "four_ls" => %w[liked learned lacked longed_for action_items],
    "mad_sad_glad" => %w[mad sad glad action_items]
  }.freeze

  belongs_to :workspace
  belongs_to :sprint, optional: true
  belongs_to :created_by, class_name: "User", optional: true
  has_many :cards, -> { order(:id) }, class_name: "RetroCard", dependent: :destroy, inverse_of: :retrospective

  validates :title, presence: true
  validates :template, inclusion: { in: TEMPLATES.keys }
  validates_same_workspace :sprint
  validate :template_is_fixed, on: :update

  # Column keys of this board, in display order.
  def columns
    TEMPLATES.fetch(template, [])
  end

  def cards_count
    cards.size
  end

  # Cards already turned into tasks.
  def tasks_count
    cards.to_a.count(&:task_id?)
  end

  private

  def template_is_fixed
    errors.add(:template, "can't change once the board has been created") if template_changed?
  end
end
