# Finds the folder or document a hierarchical URL points at: first the live
# tree (slugs from the Space's Root down), then PathAlias for addresses an
# item used to have. Pure lookups; returns the record or nil.
#
# The address does not name a Space, so `find_across` looks in the Spaces it is
# given and nowhere else (callers pass only the Spaces the person can open).
module PathResolver
  # The item and the Space it was found in.
  Match = Struct.new(:workspace, :item)

  module_function

  # `segments` are the lowercase slugs of a request path (see Slug.split).
  def find(workspace, segments)
    return nil if segments.empty? || workspace.root_folder_id.nil?
    live(workspace, segments) || aliased(workspace, segments)
  end

  # The same address in several Spaces: the `preferred` one (the Space the
  # person has open) first, then the rest in id order, so when two Spaces hold
  # the same path the answer is always the same. A Space's live and old paths
  # both count before the next Space is tried. Returns a Match or nil.
  def find_across(workspaces, segments, preferred: nil)
    ordered = workspaces.sort_by { |workspace| [ workspace.id == preferred&.id ? 0 : 1, workspace.id ] }
    ordered.each do |workspace|
      item = find(workspace, segments)
      return Match.new(workspace, item) if item
    end
    nil
  end

  def live(workspace, segments)
    folder = workspace.root_folder
    segments[0...-1].each do |segment|
      folder = Folder.find_by(parent_id: folder.id, slug: segment)
      return nil unless folder
    end
    Folder.find_by(parent_id: folder.id, slug: segments.last) || Document.find_by(folder_id: folder.id, slug: segments.last)
  end

  # An item that moved to another Space keeps its old alias rows, but those
  # paths must not lead there, so the target has to still be in this Space.
  def aliased(workspace, segments)
    target = PathAlias.find_by(workspace_id: workspace.id, path: Slug.join(segments))&.target
    target if target&.slug_workspace_id == workspace.id
  end
end
