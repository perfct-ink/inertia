# "source links to target": which documents a document points at, rebuilt from
# its content every time it is saved, so a document can list the documents that
# link to it (docs/features/document_backlinks.md).
class DocumentLink < ApplicationRecord
  # The address of a document in the app, as a link in the text holds it, by
  # id: "/documents/12", "/documents/12#launch-plan" (a heading link), the hash
  # router's "#/documents/12", or either behind a scheme and host. The path has
  # to start with documents/<id>. Ids keep working when a document is renamed or
  # moved, while hierarchical URLs (folder slugs in the path) put other things in
  # front, so "/product/documents/5" (a document titled "5" in a folder called
  # "documents") is not mistaken for document 5.
  HREF = %r{\A(?:https?://[^/?#]+)?(?:/\#|\#|)/documents/(\d+)(?:[/?\#]|\z)}

  belongs_to :source_document, class_name: "Document"
  belongs_to :target_document, class_name: "Document"

  validates :target_document_id, uniqueness: { scope: :source_document_id }

  # The ids of the documents a TipTap JSON `content` links to: documentLink
  # nodes (the `[[` link, once the editor has it), and ordinary links whose
  # address is a document's (including links to a heading in it).
  def self.target_ids_in(content)
    ids = []
    walk = lambda do |node|
      next unless node.is_a?(Hash)
      ids << node.dig("attrs", "documentId").to_i if node["type"] == "documentLink" && node.dig("attrs", "documentId")
      Array(node["marks"]).each do |mark|
        href = mark.dig("attrs", "href") if mark.is_a?(Hash) && mark["type"] == "link"
        ids << Regexp.last_match(1).to_i if href.to_s =~ HREF
      end
      Array(node["content"]).each(&walk)
    end
    walk.call(content)
    ids.uniq.select(&:positive?)
  end

  # Replaces `document`'s outgoing links to match its content. Only documents
  # in the same Space count, and a document does not link to itself.
  def self.refresh!(document)
    wanted = target_ids_in(document.content) - [ document.id ]
    wanted = Document.joins(:folder).where(id: wanted, folders: { workspace_id: document.folder.workspace_id }).pluck(:id) if wanted.any?
    existing = where(source_document_id: document.id).pluck(:target_document_id)
    return if existing.sort == wanted.sort

    transaction do
      where(source_document_id: document.id, target_document_id: existing - wanted).delete_all
      # insert_all skips a pair another save added meanwhile instead of failing this one.
      rows = (wanted - existing).map { |target_id| { source_document_id: document.id, target_document_id: target_id } }
      insert_all(rows, unique_by: %i[source_document_id target_document_id]) if rows.any?
    end
  end

  # Rebuilds the links of every document, for documents saved before this
  # existed: `DocumentLink.rebuild_all!`.
  def self.rebuild_all!
    Document.where(doc_type: :document).includes(:folder).find_each { |document| refresh!(document) }
  end
end
