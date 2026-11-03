# What a public share link shows. Every field is listed here by hand instead of
# coming from the usual blueprints, so nothing leaks by accident: no people
# (no ids, names or emails of members or authors), no owners, no tasks, and
# nothing from outside the shared item. A visitor gets titles, folder names
# and the text of documents, read-only (docs/features/shared_links.md).
class SharedContent
  KINDS = { "Document" => "document", "Folder" => "folder", "Workspace" => "roadmap" }.freeze
  # Caps on a folder listing, so one link can't ask for the whole Space.
  MAX_FOLDERS = 500
  MAX_DOCUMENTS = 500

  class << self
    # The page for the token itself: the document, the folder listing, or the roadmap.
    def for(share)
      resource =
        case share.shareable
        when Document then { document: document_payload(share.shareable) }
        when Folder then folder_payload(share.shareable)
        when Workspace then { roadmap: RoadmapSnapshot.for(share.shareable) }
        end
      envelope(share, resource)
    end

    # One document inside a folder link (the caller has checked share.covers?).
    def document(share, document)
      envelope(share, { document: document_payload(document).merge(id: document.id) })
    end

    # Document content with the Space's internal task ids taken out of task
    # lines: a link holder reads the lines, not the tasks behind them.
    def public_content(node)
      case node
      when Array then node.map { |child| public_content(child) }
      when Hash
        copy = node.transform_values { |value| public_content(value) }
        copy["attrs"] = copy["attrs"].except("taskId") if copy["type"] == "workspaceTaskItem" && copy["attrs"].is_a?(Hash)
        copy
      else node
      end
    end

    private

    # Always view: whatever permission the share was made with, a link is
    # read-only.
    def envelope(share, resource)
      { kind: KINDS.fetch(share.shareable_type), access: "view", expires_at: share.expires_at, resource: resource }
    end

    def document_payload(document)
      { title: document.title, doc_type: document.doc_type, content: public_content(document.content), updated_at: document.updated_at }
    end

    def folder_payload(folder)
      folders = subfolders(folder)
      documents = Document.where(folder_id: [ folder.id, *folders.map(&:id) ], doc_type: Share::SHAREABLE_DOC_TYPES)
        .order(:title).limit(MAX_DOCUMENTS + 1).select(:id, :title, :folder_id, :updated_at).to_a
      {
        folder: { id: folder.id, name: folder.name, icon: folder.icon },
        folders: folders.map { |sub| { id: sub.id, name: sub.name, icon: sub.icon, parent_id: sub.parent_id } },
        documents: documents.first(MAX_DOCUMENTS).map { |doc| { id: doc.id, title: doc.title, folder_id: doc.folder_id, updated_at: doc.updated_at } },
        truncated: documents.size > MAX_DOCUMENTS
      }
    end

    # The folders below this one, any depth, level by level. Archived folders
    # (and so everything under them) are left out, as in the sidebar.
    def subfolders(folder)
      found = []
      seen = Set.new([ folder.id ])
      frontier = [ folder.id ]
      while frontier.any? && found.size < MAX_FOLDERS
        level = Folder.active.where(parent_id: frontier).order(:position, :name).select(:id, :name, :icon, :parent_id).reject { |sub| seen.include?(sub.id) }
        level.each { |sub| seen.add(sub.id) }
        found.concat(level)
        frontier = level.map(&:id)
      end
      found.first(MAX_FOLDERS)
    end
  end
end
