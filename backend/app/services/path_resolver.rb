# Finds the folder or document a hierarchical URL points at: first the live
# tree (slugs from the Space's Root down), then PathAlias for addresses an
# item used to have. Pure lookups; returns the record or nil.
module PathResolver
  module_function

  # `segments` are the lowercase slugs of a request path (see Slug.split).
  def find(workspace, segments)
    return nil if segments.empty? || workspace.root_folder_id.nil?
    live(workspace, segments) || aliased(workspace, segments)
  end

  def live(workspace, segments)
    folder = workspace.root_folder
    segments[0...-1].each do |segment|
      folder = Folder.find_by(parent_id: folder.id, slug: segment)
      return nil unless folder
    end
    Folder.find_by(parent_id: folder.id, slug: segments.last) || Document.find_by(folder_id: folder.id, slug: segments.last)
  end

  def aliased(workspace, segments)
    PathAlias.find_by(workspace_id: workspace.id, path: Slug.join(segments))&.target
  end
end
