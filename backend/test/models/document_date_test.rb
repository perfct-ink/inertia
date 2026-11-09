require "test_helper"

class DocumentDateTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-document-date@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Plans")
    @document = Document.create!(title: "Launch plan", folder: @folder, created_by: @user)
  end

  test "a date points at its document and is filed in the document's folder" do
    date = @workspace.document_dates.create!(date: Date.new(2026, 12, 1), label: "Ship the beta", document: @document)
    assert_equal @document, date.reload.document
    assert_equal @folder, date.folder
  end

  test "a date needs a day" do
    assert_not @workspace.document_dates.build(label: "No day").valid?
  end

  test "the document must be in the same space" do
    other = User.create!(name: "O", email: "o-document-date@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    date = @workspace.document_dates.build(date: Date.new(2026, 12, 1), document: theirs)
    assert_not date.valid?
    assert_includes date.errors[:document], "must be in the same space"
  end

  test "the folder must be in the same space" do
    other = User.create!(name: "O", email: "o-document-date-folder@example.com", password: "password123")
    date = @workspace.document_dates.build(date: Date.new(2026, 12, 1), folder: other.workspace.folders.create!(name: "X"))
    assert_not date.valid?
    assert_includes date.errors[:folder], "must be in the same space"
  end

  test "deleting the document keeps the date, unlinked, in its folder" do
    date = @workspace.document_dates.create!(date: Date.new(2026, 12, 1), document: @document)
    @document.destroy
    assert_nil date.reload.document_id
    assert_equal @folder.id, date.folder_id
  end

  test "deleting the folder keeps the date, out of any project" do
    date = @workspace.document_dates.create!(date: Date.new(2026, 12, 1), document: @document)
    @folder.destroy
    assert_nil date.reload.document_id
    assert_nil date.folder_id
  end

  test "moving the document to another folder moves its dates with it" do
    date = @workspace.document_dates.create!(date: Date.new(2026, 12, 1), document: @document)
    other_folder = @workspace.folders.create!(name: "Later")
    @document.update!(folder: other_folder)
    assert_equal other_folder.id, date.reload.folder_id
  end

  test "an unlinked date stays where it is when other documents move" do
    date = @workspace.document_dates.create!(date: Date.new(2026, 12, 1), document: @document)
    date.update!(document: nil)
    @document.update!(folder: @workspace.folders.create!(name: "Later"))
    assert_equal @folder.id, date.reload.folder_id
  end
end
