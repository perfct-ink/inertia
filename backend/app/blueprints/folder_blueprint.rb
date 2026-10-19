class FolderBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :kind, :project_type, :dependency_mode, :position, :pinned, :created_at, :updated_at

  field :parent_id
  field :root do |folder, options|
    folder.id == (options[:root_folder_id] || folder.workspace.root_folder_id)
  end
  field :archived_at
  field :archived?, name: :archived

  view :with_children do
    # Only active children — an archived subfolder (and everything nested
    # under it) disappears from the normal tree instead of showing up
    # inside an otherwise-active parent. The dedicated archived listing
    # (FoldersController#index with archived=1) queries archived folders
    # directly, so it doesn't go through this association at all.
    association :children, blueprint: FolderBlueprint, view: :with_children do |folder, _options|
      folder.children.active
    end
    association :documents, blueprint: DocumentBlueprint

    # Sidebar indicator icons — see WorkspacesController#show, which
    # precomputes these sets once for the whole tree instead of querying per
    # folder. Falls back to empty sets so other renderers of this view
    # (e.g. FoldersController) don't have to pass them.
    field :has_tasks do |folder, options|
      task_folder_ids = options[:task_folder_ids] || Set.new
      task_document_ids = options[:task_document_ids] || Set.new
      task_folder_ids.include?(folder.id) || folder.documents.any? { |d| task_document_ids.include?(d.id) }
    end

    field :has_events do |folder, options|
      (options[:event_folder_ids] || Set.new).include?(folder.id)
    end
  end
end
