class WorkspaceBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :root_folder_id, :personal
  field(:features) { |workspace| workspace.enabled_features }

  # The signed-in user's role here; callers pass `roles: { workspace_id => role }`.
  field :role do |workspace, options|
    options[:roles]&.dig(workspace.id)
  end

  view :with_folders do
    association :folders, blueprint: FolderBlueprint, view: :with_children do |workspace, _options|
      workspace.folders.where(parent_id: nil).order(:position, :name)
    end
  end
end
