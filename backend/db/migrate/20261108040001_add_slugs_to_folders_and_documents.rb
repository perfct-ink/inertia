# Hierarchical URLs: every folder and document gets a URL slug, unique within
# its parent folder (sub-folders and documents share one namespace). The
# numeric id stays the fallback address, so nothing here changes an id.
#
# Existing rows are given slugs from their names, oldest first, so the oldest
# item keeps the plain slug and later namesakes become -2, -3, ... Items
# directly under a Space's Root also avoid the reserved top-level routes.
# The Root has no slug.
class AddSlugsToFoldersAndDocuments < ActiveRecord::Migration[7.2]
  def up
    add_column :folders, :slug, :string
    add_column :documents, :slug, :string

    folder_record = Class.new(ActiveRecord::Base) { self.table_name = "folders" }
    document_record = Class.new(ActiveRecord::Base) { self.table_name = "documents" }
    # Each Root (a folder with no parent) starts its own tree; walk it
    # breadth-first so a parent always has its slug before its children.
    pending = folder_record.where(parent_id: nil).pluck(:id).map { |id| [ id, true ] }
    until pending.empty?
      parent_id, top_level = pending.shift
      taken = Set.new
      reserved = top_level ? Slug::RESERVED : []
      folder_record.where(parent_id: parent_id).order(:id).each do |folder|
        slug = Slug.unique(Slug.slugify(folder.name), taken, reserved: reserved)
        taken << slug
        folder.update_columns(slug: slug)
        pending << [ folder.id, false ]
      end
      document_record.where(folder_id: parent_id).order(:id).each do |document|
        slug = Slug.unique(Slug.slugify(document.title), taken, reserved: reserved)
        taken << slug
        document.update_columns(slug: slug)
      end
    end

    add_index :folders, [ :parent_id, :slug ], unique: true
    add_index :documents, [ :folder_id, :slug ], unique: true
  end

  def down
    remove_index :documents, [ :folder_id, :slug ]
    remove_index :folders, [ :parent_id, :slug ]
    remove_column :documents, :slug
    remove_column :folders, :slug
  end
end
