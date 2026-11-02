# What a public roadmap link shows: titles, dates, status, health and progress
# for milestones, initiatives and epics. Owners, descriptions and folders are
# left out on purpose, so external stakeholders see the plan, not the internals.
class RoadmapSnapshot
  SHARED_FIELDS = {
    milestones: %w[id title target_date status percent health tasks_count done_tasks_count],
    initiatives: %w[id title milestone_id start_date target_date status health horizon tasks_count done_tasks_count],
    epics: %w[id title initiative_id milestone_id start_date target_date horizon tasks_count done_tasks_count]
  }.freeze

  def self.for(workspace)
    {
      name: workspace.name,
      milestones: pick(:milestones, MilestoneBlueprint.render_as_hash(workspace.milestones.order(Arel.sql("target_date IS NULL"), :target_date, :title), rollups: MilestoneRollup.for(workspace))),
      initiatives: pick(:initiatives, InitiativeBlueprint.render_as_hash(workspace.initiatives)),
      epics: pick(:epics, EpicBlueprint.render_as_hash(workspace.epics.with_task_counts))
    }
  end

  def self.pick(kind, rows)
    rows.map { |row| row.stringify_keys.slice(*SHARED_FIELDS.fetch(kind)) }
  end
  private_class_method :pick
end
