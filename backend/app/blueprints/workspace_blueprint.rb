class WorkspaceBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :root_folder_id, :personal

  # The optional pages this Space shows (every one unless it chose), as keys
  # of Workspace::FEATURES; never null.
  field :features do |workspace, _options|
    workspace.enabled_features
  end

  # The signed-in user's role here; callers pass `roles: { workspace_id => role }`.
  field :role do |workspace, options|
    options[:roles]&.dig(workspace.id)
  end

  view :with_folders do
    # True when more than one person can open the Space (members or teams);
    # the sidebar shows "My work" only then.
    field :shared?, name: :shared

    association :folders, blueprint: FolderBlueprint, view: :with_children do |workspace, _options|
      workspace.folders.where(parent_id: nil).order(:position, :name)
    end
  end
end
