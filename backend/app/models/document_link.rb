# "source links to target", rebuilt from the source's content on every save.
class DocumentLink < ApplicationRecord
  HREF = %r{(?:\A|/)documents/(\d+)(?:[/?#]|\z)}

  belongs_to :source_document, class_name: "Document"
  belongs_to :target_document, class_name: "Document"

  validates :target_document_id, uniqueness: { scope: :source_document_id }

  # The ids of the documents a TipTap JSON `content` links to: documentLink
  # nodes, and ordinary links whose address is /documents/<id>.
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
    wanted = Document.joins(:folder).where(id: wanted, folders: { workspace_id: document.folder.workspace_id }).pluck(:id)
    transaction do
      where(source_document_id: document.id).where.not(target_document_id: wanted).delete_all
      (wanted - where(source_document_id: document.id).pluck(:target_document_id)).each do |target_id|
        create!(source_document_id: document.id, target_document_id: target_id)
      end
    end
  end
end
