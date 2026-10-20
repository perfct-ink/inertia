# The automatic, read-only reverse side of relations. When every Song links to
# an Album, the Album collection shows each album's Songs without a field being
# set up on the Album. One column per relation field (in this Space) that points
# at the collection; one-record and "many" relation fields both count.
class TableBackrefs
  def initialize(table)
    @table = table
  end

  def fields
    @fields ||= TableField.where(relation_table_id: @table.id, data_type: "relation").includes(:document).order(:id).to_a
  end

  # [{ id:, name:, source_table_id: }]. The name is the linking collection's
  # title, with the field's name when that collection links here more than once.
  def columns
    counts = fields.group_by(&:document_id).transform_values(&:size)
    fields.map do |field|
      name = counts[field.document_id] > 1 ? "#{field.document.title} (#{field.name})" : field.document.title
      { id: field.id, name: name, source_table_id: field.document_id }
    end
  end

  # { record_id => { "field_id" => [{ id:, label: }] } } for the records linked to.
  def by_record
    return {} if fields.empty?
    pairs = linking_cells
    labels = labels_for(pairs.map(&:last).uniq)
    pairs.each_with_object(Hash.new { |h, k| h[k] = Hash.new { |h2, k2| h2[k2] = [] } }) do |(target_id, field_id, source_id), result|
      result[target_id][field_id.to_s] << { id: source_id, label: labels[source_id] }
    end.transform_values { |per_field| per_field.transform_values { |list| list.uniq.sort_by { |item| item[:id] } } }
  end

  private

  # [[linked record id, field id, linking record id]]
  def linking_cells
    many_ids, single_ids = fields.partition(&:allow_many).map { |group| group.map(&:id) }
    single = TableCell.where(table_field_id: single_ids).where.not(related_record_id: nil).pluck(:related_record_id, :table_field_id, :table_record_id)
    many = TableCellLink.joins(:table_cell).where(table_cells: { table_field_id: many_ids })
                        .pluck("table_cell_links.related_record_id", "table_cells.table_field_id", "table_cells.table_record_id")
    single + many
  end

  # Each linking record shows as its collection's first text value, or #id.
  def labels_for(record_ids)
    documents = TableRecord.where(id: record_ids).pluck(:id, :document_id).to_h
    text_fields = TableField.where(document_id: documents.values.uniq, data_type: "text").order(:id).group_by(&:document_id).transform_values { |list| list.first.id }
    values = TableCell.where(table_record_id: record_ids, table_field_id: text_fields.values).pluck(:table_record_id, :value).to_h
    record_ids.to_h { |id| [ id, values[id].presence || "##{id}" ] }
  end
end
