class WorkspaceBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :root_folder_id

  view :with_folders do
    association :folders, blueprint: FolderBlueprint, view: :with_children do |workspace, _options|
      workspace.folders.where(parent_id: nil).order(:position, :name)
    end
  end
end
