require "test_helper"

class TableMirrorTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "table-mirror@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @contacts = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @companies = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    @company_name = @companies.table_fields.create!(name: "Name", data_type: "text")
    @company_active = @companies.table_fields.create!(name: "Active", data_type: "boolean")
    @company = @contacts.table_fields.create!(name: "Company", data_type: "relation", relation_table: @companies)
    @mirror = @contacts.table_fields.create!(name: "Company name", data_type: "mirror", mirror_relation_field: @company, mirror_field: @company_name)
  end

  def values_for(*records)
    TableMirrors.new(@contacts).values_for(records.map { |record| TableRecord.includes(:table_cells).find(record.id) })
  end

  test "a mirror shows the mirrored field of the linked record, empty when nothing is linked or set" do
    acme = @companies.table_records.create!
    acme.table_cells.create!(table_field: @company_name, value: "Acme")
    ada = @contacts.table_records.create!
    ada.table_cells.create!(table_field: @company, related_record: acme)
    unlinked = @contacts.table_records.create!
    blank = @companies.table_records.create!
    grace = @contacts.table_records.create!
    grace.table_cells.create!(table_field: @company, related_record: blank)
    assert_equal({ ada.id => { @mirror.id.to_s => [ "Acme" ] }, unlinked.id => { @mirror.id.to_s => [] }, grace.id => { @mirror.id.to_s => [] } }, values_for(ada, unlinked, grace))
  end

  test "mirrored false and zero are values, not blanks" do
    flag = @contacts.table_fields.create!(name: "Company active", data_type: "mirror", mirror_relation_field: @company, mirror_field: @company_active)
    acme = @companies.table_records.create!
    acme.table_cells.create!(table_field: @company_active, value: false)
    ada = @contacts.table_records.create!
    ada.table_cells.create!(table_field: @company, related_record: acme)
    assert_equal [ false ], values_for(ada)[ada.id][flag.id.to_s]
  end

  test "a collection without mirror fields has nothing to compute" do
    assert_equal({}, TableMirrors.new(@companies).values_for([ @companies.table_records.create! ]))
  end

  test "a mirror reads through a relation field of its own collection" do
    text = @contacts.table_fields.create!(name: "Nickname", data_type: "text")
    assert_not @contacts.table_fields.build(name: "A", data_type: "mirror", mirror_relation_field: text, mirror_field: @company_name).valid?
    assert_not @contacts.table_fields.build(name: "B", data_type: "mirror", mirror_field: @company_name).valid?
    elsewhere = @companies.table_fields.create!(name: "Parent", data_type: "relation", relation_table: @companies)
    assert_not @contacts.table_fields.build(name: "C", data_type: "mirror", mirror_relation_field: elsewhere, mirror_field: @company_name).valid?
  end

  test "a mirror shows a plain field of the connected collection" do
    own = @contacts.table_fields.create!(name: "Nickname", data_type: "text")
    other = @folder.documents.create!(title: "Other", doc_type: :table, created_by: @user).table_fields.create!(name: "Name", data_type: "text")
    link = @companies.table_fields.create!(name: "Parent", data_type: "relation", relation_table: @companies)
    [ own, other, link, @mirror, nil ].each_with_index do |field, i|
      assert_not @contacts.table_fields.build(name: "Bad #{i}", data_type: "mirror", mirror_relation_field: @company, mirror_field: field).valid?, "accepted #{field&.name}"
    end
  end

  test "mirror targets are only kept on mirror fields and a mirror takes no related collection" do
    field = @contacts.table_fields.create!(name: "Note", data_type: "text", mirror_relation_field_id: @company.id, mirror_field_id: @company_name.id)
    assert_nil field.reload.mirror_relation_field_id
    assert_nil field.mirror_field_id
    assert_not @contacts.table_fields.build(name: "D", data_type: "mirror", relation_table: @companies, mirror_relation_field: @company, mirror_field: @company_name).valid?
  end

  test "a mirror cannot hold a value" do
    cell = @contacts.table_records.create!.table_cells.build(table_field: @mirror, value: "Acme")
    assert_not cell.valid?
    assert_match(/mirror/, cell.errors.full_messages.join)
  end

  test "the relation field and the shown field are fixed while a mirror depends on them" do
    assert_not @company.update(relation_table: @contacts)
    assert_not @company.reload.update(data_type: "text", relation_table: nil)
    assert @company.reload.update(name: "Employer")
    assert @company_active.update(data_type: "text")
    assert_not @company_name.update(data_type: "relation", relation_table: @companies)
    @mirror.destroy!
    assert @company.reload.update(data_type: "text", relation_table: nil)
  end

  test "deleting the relation field or the shown field deletes the mirror" do
    @company_name.destroy!
    assert_not TableField.exists?(@mirror.id)
    name = @companies.table_fields.create!(name: "Title", data_type: "text")
    mirror = @contacts.table_fields.create!(name: "Company title", data_type: "mirror", mirror_relation_field: @company, mirror_field: name)
    @company.destroy!
    assert_not TableField.exists?(mirror.id)
  end

  test "deleting a collection that holds mirrors succeeds" do
    assert @contacts.destroy
    assert_not TableField.exists?(@mirror.id)
  end
end
