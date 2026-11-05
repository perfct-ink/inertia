# A measurable result under an objective. Linked to an initiative, it moves
# with that initiative's done/total tasks; otherwise it is a number someone
# updates by hand, measured from start_value toward target_value (which may
# be lower than the start, e.g. "cut churn from 8% to 5%").
class KeyResult < ApplicationRecord
  belongs_to :objective
  belongs_to :initiative, optional: true
  has_many :check_ins, -> { order(created_at: :desc, id: :desc) }, class_name: "KeyResultCheckIn", dependent: :destroy

  # Set by the caller so the check-in recorded below knows who and why.
  attr_accessor :check_in_author, :check_in_note

  # Every change of the number is kept, so progress over a period can be reviewed.
  after_update :record_check_in, if: :saved_change_to_current_value?

  validates :title, presence: true
  validates :target_value, presence: true, unless: :initiative_id?
  validate :target_differs_from_start
  validate :initiative_in_same_workspace

  def percent
    return initiative.percent if initiative
    return 0 if target_value.nil?
    span = target_value - start_value
    ((current_value - start_value) / span * 100).clamp(0, 100).round
  end

  def record_check_in
    check_ins.create!(value: current_value, note: check_in_note.presence, author: check_in_author)
  end

  private

  def target_differs_from_start
    return if initiative_id? || target_value.nil?
    errors.add(:target_value, "must differ from the start value") if target_value == start_value
  end

  def initiative_in_same_workspace
    return if initiative.nil? || objective.nil? || initiative.workspace_id == objective.workspace_id
    errors.add(:initiative, "must belong to the same space")
  end
end
