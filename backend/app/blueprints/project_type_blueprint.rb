# A saved project type. The template itself stays on the server: the list shows
# what a new project of the type starts with as counts.
class ProjectTypeBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :description, :icon, :created_at

  field :key
  field :starts_with do |project_type, _options|
    template = project_type.template || {}
    { documents: Array(template["documents"]).size, collections: Array(template["collections"]).size, tasks: Array(template["tasks"]).size }
  end
end
