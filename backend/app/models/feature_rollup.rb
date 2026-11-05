# The features under a folder (usually a project), with each one's task counts
# including its sub-features', and its status: set by hand, or worked out from
# the tasks. Features are the documents in feature folders (folders of kind
# feature) anywhere under the folder.
class FeatureRollup
  Row = Struct.new(:document, :depth, :tasks_count, :done_tasks_count, :percent, :status, :status_derived, keyword_init: true)

  def self.for(folder)
    new(folder).rows
  end

  def initialize(folder)
    @folder = folder
  end

  # Pre-order rows (a feature followed by its sub-features), each with its
  # depth. A feature whose parent isn't in this set is treated as a root.
  def rows
    features = feature_documents.to_a
    return [] if features.empty?
    counts = own_counts(features.map(&:id))
    children = features.group_by(&:parent_feature_id)
    ids = features.map(&:id).to_set
    roots = features.select { |f| f.parent_feature_id.nil? || !ids.include?(f.parent_feature_id) }

    totals = {}
    total_for = lambda do |doc|
      totals[doc.id] ||= begin
        own = counts.fetch(doc.id, [ 0, 0 ])
        (children[doc.id] || []).reduce(own.dup) do |sum, child|
          t = total_for.call(child)
          [ sum[0] + t[0], sum[1] + t[1] ]
        end
      end
    end

    result = []
    walk = lambda do |doc, depth|
      total, done = total_for.call(doc)
      percent = total.zero? ? 0 : (done * 100.0 / total).round
      status = doc.feature_status || derived_status(total, done)
      result << Row.new(document: doc, depth: depth, tasks_count: total, done_tasks_count: done, percent: percent, status: status.to_s, status_derived: doc.feature_status.nil?)
      (children[doc.id] || []).sort_by { |c| [ c.title.to_s.downcase, c.id ] }.each { |child| walk.call(child, depth + 1) }
    end
    roots.sort_by { |r| [ r.title.to_s.downcase, r.id ] }.each { |root| walk.call(root, 0) }
    result
  end

  private

  def feature_documents
    folder_ids = @folder.self_and_descendant_ids
    feature_folder_ids = Folder.where(id: folder_ids, kind: :feature).pluck(:id)
    Document.where(folder_id: feature_folder_ids, doc_type: :document).includes(:feature_owner)
  end

  # { document_id => [tasks, done_tasks] } for the feature documents' own tasks.
  def own_counts(document_ids)
    grouped = Task.unscoped.where(document_id: document_ids).group(:document_id, :status).count
    grouped.each_with_object({}) do |((document_id, status), count), result|
      entry = (result[document_id] ||= [ 0, 0 ])
      entry[0] += count
      entry[1] += count if status.to_s == "done" || status == Task.statuses[:done]
    end
  end

  # No tasks: planned. All done: done. Some done: active. Otherwise planned.
  def derived_status(total, done)
    return "planned" if total.zero?
    return "done" if done == total
    done.positive? ? "active" : "planned"
  end
end
