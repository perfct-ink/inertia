# An address a folder or document used to have. When an item is renamed or
# moved its path changes (and so does every path beneath a folder), so the old
# paths are kept here and Api::V1::PathsController redirects them to the
# item's current path. The numeric-id URLs stay valid regardless.
#
# `path` is the slugs joined with "/", without the Root: "acme/product/specs".
class PathAlias < ApplicationRecord
  belongs_to :workspace
  belongs_to :target, polymorphic: true

  validates :path, presence: true

  # Remembers where each [record, segments] pair used to live. A path that
  # already points somewhere else is taken over by the most recent owner.
  def self.remember(workspace_id, entries)
    rows = entries.map do |record, segments|
      { workspace_id: workspace_id, path: Slug.join(segments), target_type: record.class.name, target_id: record.id }
    end
    upsert_all(rows, unique_by: %i[workspace_id path]) if rows.any?
  end

  # A path that is in use again is no longer an alias of anything.
  def self.release(workspace_id, paths)
    where(workspace_id: workspace_id, path: paths).delete_all if paths.any?
  end
end
