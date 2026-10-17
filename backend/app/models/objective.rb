# The O in OKR (PM-31). Progress is the average of its key results; score is
# the same on the 0-1 scale OKR reviews use. Health uses the milestone rule
# against target_date (the end of the period).
class Objective < ApplicationRecord
  include PlanningItem
  include PlanningHealth

  belongs_to :workspace
  has_many :key_results, -> { order(:position, :id) }, dependent: :destroy, inverse_of: :objective

  validates :title, presence: true
  validate :target_date_not_before_start_date

  def percent
    results = key_results.to_a
    return 0 if results.empty?
    (results.sum(&:percent) / results.size.to_f).round
  end

  def score
    (percent / 100.0).round(2)
  end

  private

  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
