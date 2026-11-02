class ActivityBlueprint < Blueprinter::Base
  identifier :id
  fields :action, :created_at

  field(:actor_name) { |activity| activity.actor&.name }
  field(:changes) { |activity| activity.field_changes }
end
