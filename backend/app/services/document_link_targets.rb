# Answers, in one query, "do these documents still exist, and what headings do
# they have?" for the editor's broken-link check (docs/features/heading_links.md).
# A document that comes back is there for the user to open; one that does not
# was deleted (or sits in a Space the user can't reach). Asking about all of an
# open document's links at once keeps the check at one request per document
# instead of one per link.
class DocumentLinkTargets
  # More ids than any real document links to; extras are ignored.
  MAX_IDS = 100

  def initialize(workspace_ids)
    @workspace_ids = workspace_ids
  end

  # [{ id:, doc_type:, headings: [{ id:, text:, level: }] }] for each requested
  # document that exists in one of the Spaces, in no particular order.
  def lookup(ids)
    ids = normalize(ids)
    return [] if ids.empty?

    Document.joins(:folder)
      .where(folders: { workspace_id: @workspace_ids }, id: ids)
      .select(:id, :doc_type, :content)
      .map { |document| { id: document.id, doc_type: document.doc_type, headings: document.headings } }
  end

  private

  # Accepts ids as an array or a comma-separated string; drops anything that is
  # not a positive integer and repeats.
  def normalize(ids)
    ids = ids.split(",") if ids.is_a?(String)
    return [] unless ids.is_a?(Array)

    ids.filter_map { |id| Integer(id.to_s, exception: false) }.select(&:positive?).uniq.first(MAX_IDS)
  end
end
