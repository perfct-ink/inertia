# "Successor depends on predecessor" (PM-13). The four Gantt link types:
# finish_to_start is the usual "B can't start until A is done".
class TaskDependency < ApplicationRecord
  belongs_to :workspace
  belongs_to :predecessor, class_name: "Task"
  belongs_to :successor, class_name: "Task"

  enum :kind, { finish_to_start: 0, start_to_start: 1, finish_to_finish: 2, start_to_finish: 3 }, validate: true

  before_validation { self.workspace_id ||= predecessor&.workspace_id }

  validates :successor_id, uniqueness: { scope: :predecessor_id, message: "already depends on that task" }
  validate :distinct_tasks_in_one_workspace
  validate :no_cycle

  private

  def distinct_tasks_in_one_workspace
    return unless predecessor && successor
    errors.add(:successor, "can't depend on itself") if predecessor_id == successor_id
    unless predecessor.workspace_id == workspace_id && successor.workspace_id == workspace_id
      errors.add(:base, "Both tasks must be in the same space")
    end
  end

  # Walks forward from the successor; reaching the predecessor again means
  # this link would close a loop. Breadth-first over ids, one query per
  # level, which stays cheap for the short chains a Gantt chart has.
  def no_cycle
    return unless predecessor_id && successor_id && predecessor_id != successor_id
    seen = Set[successor_id]
    frontier = [ successor_id ]
    until frontier.empty?
      frontier = TaskDependency.where(predecessor_id: frontier).where.not(id: id).pluck(:successor_id) - seen.to_a
      if frontier.include?(predecessor_id)
        errors.add(:base, "That dependency would create a loop")
        return
      end
      seen.merge(frontier)
    end
  end
end
