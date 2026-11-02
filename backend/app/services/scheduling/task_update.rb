module Scheduling
  # Saves an edit to a task. When the edit moves the task's dates, the
  # dependency mode of the folder the task sits in (directly, or through its
  # document) decides what happens (PM-14): `strict` refuses a move that would
  # break one of its links, `flexible` also moves the tasks that wait on it,
  # all in one transaction. See DependencyPlanner for the rules.
  #
  #   update = Scheduling::TaskUpdate.new(task)
  #   update.call(task_params) # => true / false
  #   update.rescheduled       # other tasks moved along with this one
  #   update.errors            # messages when it returned false
  class TaskUpdate
    attr_reader :task, :rescheduled, :errors

    def initialize(task)
      @task = task
      @rescheduled = []
      @errors = []
    end

    def call(attributes)
      task.assign_attributes(attributes)
      return fail_with(task.errors.full_messages) unless task.valid?

      plan = plan_dates
      return fail_with([ plan.error ]) if plan&.error

      Task.transaction do
        task.save!
        @rescheduled = move_others(plan)
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      fail_with(e.record.errors.full_messages)
    end

    private

    def fail_with(messages)
      @errors = messages
      false
    end

    # Nil when the dates did not change, the task has no dated end, or its
    # folder ignores dependencies.
    def plan_dates
      return unless task.persisted? && task.due_date && (task.start_date_changed? || task.due_date_changed?)
      mode = dependency_mode
      return if mode == "none"

      links = links_for(mode)
      ids = links.flat_map { |l| [ l.predecessor_id, l.successor_id ] } | [ task.id ]
      # Fresh rows: the task in memory already carries the new dates.
      @others = Task.where(workspace_id: task.workspace_id, id: ids).index_by(&:id)
      DependencyPlanner.new(@others.values, links).plan(task.id, task.start_date || task.due_date, task.due_date, mode)
    end

    def dependency_mode
      (task.folder || task.document&.folder)&.dependency_mode || "none"
    end

    # Strict only looks at the links touching the task. Flexible needs
    # everything downstream of it plus the other links into those tasks, so a
    # pulled task can stop at what its other predecessors allow.
    def links_for(mode)
      reach = mode == "flexible" ? downstream_ids : [ task.id ]
      scope = TaskDependency.where(workspace_id: task.workspace_id)
      scope.where(predecessor_id: reach).or(scope.where(successor_id: reach)).to_a
    end

    # The task and every task that waits on it, one query per level.
    def downstream_ids
      seen = [ task.id ]
      frontier = seen
      until frontier.empty?
        frontier = TaskDependency.where(predecessor_id: frontier).pluck(:successor_id) - seen
        seen |= frontier
      end
      seen
    end

    def move_others(plan)
      return [] unless plan

      plan.updates.reject { |u| u.id == task.id }.map do |u|
        other = @others.fetch(u.id)
        other.update!(start_date: u.start_date, due_date: u.due_date)
        other
      end
    end
  end
end
