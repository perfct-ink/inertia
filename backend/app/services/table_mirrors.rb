# Values for a collection's mirror fields. A mirror holds no cells of its own:
# for each record it follows the record's link in the mirror's relation field
# and reads the mirrored field's cell on the linked record. Each value is a
# list, empty when the record has no link or the linked record has no value,
# so a relation that holds several records can fill the list later.
class TableMirrors
  def initialize(table)
    @mirrors = table.table_fields.where(data_type: "mirror").to_a
  end

  # { record_id => { "mirror_field_id" => [value, ...] } } for records loaded
  # with their table_cells; one query however many records there are.
  def values_for(records)
    return {} if @mirrors.empty?
    linked_ids = records.flat_map { |record| record.table_cells.filter_map(&:related_record_id) }.uniq
    shown = TableCell.where(table_record_id: linked_ids, table_field_id: @mirrors.map(&:mirror_field_id)).index_by { |cell| [ cell.table_record_id, cell.table_field_id ] }
    records.to_h do |record|
      links = record.table_cells.index_by(&:table_field_id)
      [ record.id, @mirrors.to_h { |mirror| [ mirror.id.to_s, mirrored_values(links[mirror.mirror_relation_field_id], shown, mirror) ] } ]
    end
  end

  private

  def mirrored_values(link, shown, mirror)
    value = shown[[ link&.related_record_id, mirror.mirror_field_id ]]&.value
    value.nil? ? [] : [ value ]
  end
end
