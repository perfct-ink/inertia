# Time a person spent on a task. While `ended_at` is empty the timer is
# running; a person can run one timer at a time.
class TimeEntry < ApplicationRecord
  belongs_to :task
  belongs_to :user

  scope :running, -> { where(ended_at: nil) }
  scope :finished, -> { where.not(ended_at: nil) }

  validates :started_at, presence: true
  validate :ends_after_it_starts
  validate :one_running_timer_per_user, on: :create

  def running? = ended_at.nil?

  def minutes
    return 0 unless ended_at
    ((ended_at - started_at) / 60).round
  end

  def stop!(at = Time.current)
    update!(ended_at: at)
  end

  private

  def ends_after_it_starts
    errors.add(:ended_at, "can't be before the start") if ended_at && started_at && ended_at < started_at
  end

  def one_running_timer_per_user
    return unless running? && user_id
    errors.add(:base, "Stop your running timer before starting another") if TimeEntry.running.where(user_id: user_id).exists?
  end
end
