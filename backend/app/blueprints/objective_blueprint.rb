class ObjectiveBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :owner_id, :start_date, :target_date, :created_at, :updated_at
  field :percent
  field :score
  field(:health) { |objective| objective.health(objective.percent) }
  association :key_results, blueprint: KeyResultBlueprint
end
