# Gives a folder or document a URL slug for hierarchical URLs (see Slug).
#
# The slug is made from the name or title and is unique among everything in
# the same parent folder: sub-folders and documents share one namespace so a
# path names exactly one item. It follows renames and moves; the paths an item
# used to have are saved as PathAlias rows so old links redirect. Items
# directly under the Space's Root also avoid Slug::RESERVED. The Root itself
# has no slug and adds nothing to a path.
#
#   slugged_by :name, within: :parent    # Folder
#   slugged_by :title, within: :folder   # Document
module Sluggable
  extend ActiveSupport::Concern

  included do
    class_attribute :slug_source_attribute, :slug_parent_association, instance_writer: false

    has_many :path_aliases, as: :target, dependent: :delete_all

    before_validation :assign_slug
    validates :slug, presence: true, unless: -> { slug_parent.nil? }
    validates :slug, format: { with: Slug::FORMAT }, length: { maximum: 80 }, allow_nil: true
    validate :slug_unique_in_parent
    after_save :refresh_path_aliases
  end

  class_methods do
    def slugged_by(source, within:)
      self.slug_source_attribute = source
      self.slug_parent_association = within
    end

    def slug_parent_key
      reflect_on_association(slug_parent_association).foreign_key
    end
  end

  # The folder this item sits in; nil for the Root.
  def slug_parent
    public_send(slug_parent_association)
  end

  # The Space this item is in, through its parent folder.
  def slug_workspace_id
    slug_parent&.workspace_id
  end

  # The slugs from just under the Root down to this item.
  def path_segments
    parent = slug_parent
    parent ? parent.path_segments + [ slug ] : []
  end

  # [record, segments] for this item and everything nested under it (a folder
  # overrides this to include its contents).
  def path_entries
    [ [ self, path_segments ] ]
  end

  private

  def assign_slug
    parent = slug_parent
    return if parent.nil?
    return unless slug.blank? || will_save_change_to_attribute?(slug_source_attribute.to_s) || will_save_change_to_attribute?(self.class.slug_parent_key)
    reserved = parent.slug_parent.nil? ? Slug::RESERVED : []
    self.slug = Slug.unique(Slug.slugify(self[slug_source_attribute]), sibling_slugs(parent), reserved: reserved)
  end

  # Slugs of everything else in the same folder, sub-folders and documents
  # alike (ids are only unique within a table, so each side excludes itself).
  def sibling_slugs(parent)
    folders = Folder.where(parent_id: parent.id)
    documents = Document.where(folder_id: parent.id)
    folders = folders.where.not(id: id) if persisted? && is_a?(Folder)
    documents = documents.where.not(id: id) if persisted? && is_a?(Document)
    folders.pluck(:slug) + documents.pluck(:slug)
  end

  def slug_unique_in_parent
    parent = slug_parent
    return if parent.nil? || slug.blank? || !will_save_change_to_slug?
    errors.add(:slug, "is already used in this folder") if sibling_slugs(parent).include?(slug)
  end

  # After a save that created the item or changed its path: remember the old
  # paths if it was renamed or moved, then free any alias that now matches a
  # live path. Saves that only touch content (autosave) skip all of this.
  def refresh_path_aliases
    parent = slug_parent
    return if parent.nil?
    created = saved_change_to_id?
    return unless created || saved_change_to_slug? || saved_change_to_attribute?(self.class.slug_parent_key)
    entries = path_entries
    remember_previous_paths(parent.workspace_id, entries) unless created
    PathAlias.release(parent.workspace_id, entries.map { |_record, segments| Slug.join(segments) })
  end

  # Everything under this item moved together, so each old path is the old
  # location of the item plus the part below it that did not change.
  def remember_previous_paths(workspace_id, entries)
    old_parent = Folder.find_by(id: attribute_before_last_save(self.class.slug_parent_key))
    old_slug = slug_before_last_save
    # Aliases are per Space, so an item moved to another Space leaves none behind.
    return if old_parent.nil? || old_slug.blank? || old_parent.workspace_id != workspace_id
    old_location = old_parent.path_segments + [ old_slug ]
    own_length = entries.first.last.length
    PathAlias.remember(workspace_id, entries.map { |record, segments| [ record, old_location + segments.drop(own_length) ] })
  end
end
