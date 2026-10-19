# A time-boxed slice of work tasks can be assigned to — orthogonal to the
# Milestone -> Initiative -> Epic -> Task rollup chain (a sprint typically
# pulls tasks from several epics at once), so unlike Epic/Initiative this
# does not include BelongsToMilestone.
class Sprint < ApplicationRecord
  include PlanningItem

  belongs_to :workspace
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validate :end_date_not_before_start_date

  def tasks_count
    tasks.count
  end

  def done_tasks_count
    tasks.where(status: :done).count
  end

  class InvalidTransition < StandardError; end

  # Starts a planned sprint; a missing start date becomes today. A sprint that
  # is already active or done cannot be started (a closed one stays closed).
  def start!
    raise InvalidTransition, "Only a planned sprint can be started" unless planned?
    update!(status: :active, start_date: start_date || Date.current)
  end

  # Closes an active sprint. Tasks that are not done move to `carry_to` (a
  # sprint in this Space that isn't closed) or lose their sprint when it is nil;
  # done tasks stay. Returns how many tasks were completed and carried over.
  def close!(carry_to: nil)
    raise InvalidTransition, "Only an active sprint can be closed" unless active?
    if carry_to
      raise InvalidTransition, "Carry unfinished tasks to a sprint in this space" unless carry_to.workspace_id == workspace_id && carry_to.id != id
      raise InvalidTransition, "Can't carry tasks into a finished sprint" if carry_to.done?
    end
    transaction do
      unfinished = tasks.where.not(status: :done)
      carried = unfinished.count
      unfinished.update_all(sprint_id: carry_to&.id)
      completed = tasks.where(status: :done).count
      update!(status: :done)
      { completed: completed, carried_over: carried }
    end
  end

  private

  def end_date_not_before_start_date
    return unless start_date && end_date
    errors.add(:end_date, "can't be before the start date") if end_date < start_date
  end
end
