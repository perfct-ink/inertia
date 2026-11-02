require "test_helper"

class SpaceTransferMirrorTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "transfer-mirror@example.com", password: "password123")
    @source = @user.workspace
    @team = Workspace.create!(name: "Team", user: @user)
    @folder = @source.folders.create!(name: "Plans")
    @companies = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    @name = @companies.table_fields.create!(name: "Name", data_type: "text")
    @contacts = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @company = @contacts.table_fields.create!(name: "Company", data_type: "relation", relation_table: @companies)
    @mirror = @contacts.table_fields.create!(name: "Company name", data_type: "mirror", mirror_relation_field: @company, mirror_field: @name)
  end

  def transfer_into(folder)
    SpaceTransfer.new(user: @user, target_folder: folder)
  end

  test "copying a folder re-points a mirror at the copied fields" do
    copy = transfer_into(@team.root_folder).copy_folder(@folder)

    new_companies = copy.documents.find_by!(title: "Companies")
    new_contacts = copy.documents.find_by!(title: "Contacts")
    mirror = new_contacts.table_fields.find_by!(name: "Company name")
    assert_equal "mirror", mirror.data_type
    assert_equal new_contacts.table_fields.find_by!(name: "Company"), mirror.mirror_relation_field
    assert_equal new_companies.table_fields.find_by!(name: "Name"), mirror.mirror_field
    assert_equal @name, @mirror.reload.mirror_field
  end

  test "a mirror survives copying its Collection inside the same Space" do
    other_folder = @source.folders.create!(name: "Elsewhere")

    copy = transfer_into(other_folder).copy_document(@contacts)

    mirror = copy.table_fields.find_by!(name: "Company name")
    assert_equal copy.table_fields.find_by!(name: "Company"), mirror.mirror_relation_field
    assert_equal @name, mirror.mirror_field
  end

  test "a mirror's Collection cannot be copied alone into another Space" do
    error = assert_raises(SpaceTransfer::Error) { transfer_into(@team.root_folder).copy_document(@contacts) }

    assert_equal SpaceTransfer::LINKED_COLLECTION, error.message
  end
end
