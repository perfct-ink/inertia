class IoNodeBlueprint < Blueprinter::Base
  identifier :id
  field :folder_id
  fields :parent_id, :kind, :title, :description, :position, :objective_id, :initiative_id

  # Needs `progress: IoMap.progress_by_id(workspace)` in the render options.
  field(:progress) { |node, options| (options[:progress] || {})[node.id] }
end
