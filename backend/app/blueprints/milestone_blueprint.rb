class MilestoneBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :target_date, :status, :owner_id, :folder_id, :created_at, :updated_at

  # Rollup fields need `rollups: MilestoneRollup.for(workspace)` in the render options.
  field :tasks_count do |milestone, options|
    summary(milestone, options).tasks_count
  end
  field :done_tasks_count do |milestone, options|
    summary(milestone, options).done_tasks_count
  end
  field :epics_count do |milestone, options|
    summary(milestone, options).epics_count
  end
  field :initiatives_count do |milestone, options|
    summary(milestone, options).initiatives_count
  end
  field :percent do |milestone, options|
    summary(milestone, options).percent
  end
  field :health do |milestone, options|
    milestone.health(summary(milestone, options).percent)
  end

  def self.summary(milestone, options)
    (options[:rollups] || {}).fetch(milestone.id, MilestoneRollup::EMPTY)
  end
end
