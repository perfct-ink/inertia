# Progress of every milestone in a workspace, computed from what sits under
# it. A task counts toward its own milestone; without one it inherits its
# epic's, and an epic without one inherits its initiative's.
class MilestoneRollup
  Summary = Struct.new(:tasks_count, :done_tasks_count, :epics_count, :initiatives_count, keyword_init: true) do
    def percent
      tasks_count.positive? ? (done_tasks_count * 100.0 / tasks_count).round : 0
    end
  end

  EMPTY = Summary.new(tasks_count: 0, done_tasks_count: 0, epics_count: 0, initiatives_count: 0).freeze

  # { milestone_id => Summary } for the workspace. Four queries however many
  # milestones, epics or tasks there are; ids with nothing under them are absent.
  def self.for(workspace)
    summaries = Hash.new { |hash, id| hash[id] = Summary.new(tasks_count: 0, done_tasks_count: 0, epics_count: 0, initiatives_count: 0) }
    done = Task.statuses[:done]

    workspace.initiatives.where.not(milestone_id: nil).group(:milestone_id).count.each do |id, count|
      summaries[id].initiatives_count = count
    end

    workspace.epics.left_joins(:initiative).pluck("epics.milestone_id", "initiatives.milestone_id").each do |own, inherited|
      id = own || inherited
      summaries[id].epics_count += 1 if id
    end

    # .reorder(nil): Task's default_scope orders by position, which MySQL's
    # strict mode rejects alongside the joins' selected columns.
    workspace.tasks.reorder(nil).left_joins(epic: :initiative)
      .pluck("tasks.status", "tasks.milestone_id", "epics.milestone_id", "initiatives.milestone_id").each do |status, own, epic_ms, initiative_ms|
        id = own || epic_ms || initiative_ms
        next unless id
        summaries[id].tasks_count += 1
        summaries[id].done_tasks_count += 1 if status == done || status == "done"
      end

    summaries
  end
end
