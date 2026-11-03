require "test_helper"

class ShareTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-share-model@example.com", password: "password123")
    @space = @user.workspace
    @folder = @space.folders.create!(name: "Plans")
    @document = @folder.documents.create!(title: "Roadmap notes", created_by: @user)
  end

  test "a new link gets a random 128-bit URL-safe token, different every time" do
    first = @document.shares.create!(created_by: @user)
    second = @document.shares.create!(created_by: @user)

    assert_match(/\A[A-Za-z0-9_-]{22}\z/, first.token)
    assert_not_equal first.token, second.token
    assert first.view?
  end

  test "open! finds a live link and treats unknown, expired and blank tokens alike" do
    share = @document.shares.create!(created_by: @user)

    assert_equal share, Share.open!(share.token)
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!("not-a-token") }
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(nil) }
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!("") }

    share.update!(expires_at: 1.minute.ago)
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(share.token) }

    share.update!(expires_at: 1.day.from_now)
    assert_equal share, Share.open!(share.token)
  end

  test "a link stops opening once its document or folder is archived, or the document changes type" do
    doc_share = @document.shares.create!(created_by: @user)
    folder_share = @folder.shares.create!(created_by: @user)

    @document.update!(doc_type: :spreadsheet)
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(doc_share.token) }
    @document.update!(doc_type: :document)
    assert_equal doc_share, Share.open!(doc_share.token)

    @folder.archive!
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(doc_share.token) }
    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(folder_share.token) }
  end

  test "an archived parent closes the links below it" do
    parent = @space.folders.create!(name: "Parent")
    child = @space.folders.create!(name: "Child", parent: parent)
    share = child.shares.create!(created_by: @user)

    parent.archive!

    assert_raises(ActiveRecord::RecordNotFound) { Share.open!(share.token) }
  end

  test "a folder link covers documents in the folder and below it, nothing else" do
    sub = @space.folders.create!(name: "Sub", parent: @folder)
    top = @folder.documents.create!(title: "Top", created_by: @user)
    nested = sub.documents.create!(title: "Nested", created_by: @user)
    outside = @space.folders.create!(name: "Elsewhere").documents.create!(title: "Outside", created_by: @user)
    sheet = @folder.documents.create!(title: "Sheet", doc_type: :spreadsheet, created_by: @user)
    share = @folder.shares.create!(created_by: @user)

    assert share.covers?(top)
    assert share.covers?(nested)
    assert_not share.covers?(outside)
    assert_not share.covers?(sheet)

    sub.archive!
    assert_not share.covers?(nested)
  end

  test "a document link covers no document through covers?" do
    other = @folder.documents.create!(title: "Other", created_by: @user)
    share = @document.shares.create!(created_by: @user)

    assert_not share.covers?(other)
    assert_not share.covers?(@document)
  end

  test "spreadsheets, Collections and files can't be shared, nor a Space's root folder" do
    sheet = @folder.documents.create!(title: "Numbers", doc_type: :spreadsheet, created_by: @user)
    collection = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)

    [ sheet, collection ].each do |document|
      share = document.shares.build(created_by: @user)
      assert_not share.valid?
      assert_match(/Only documents/, share.errors.full_messages.to_sentence)
    end

    root_share = @space.root_folder.shares.build(created_by: @user)
    assert_not root_share.valid?
    assert_match(/root folder/, root_share.errors.full_messages.to_sentence)
  end

  test "a new link can't be an edit link, and an unknown permission is a validation error" do
    edit = @document.shares.build(created_by: @user, permission: :edit)
    assert_not edit.valid?
    assert_match(/Editing through a link/, edit.errors.full_messages.to_sentence)

    bogus = @document.shares.build(created_by: @user, permission: "owner")
    assert_not bogus.valid?
  end

  test "the roadmap link of a Space is still allowed" do
    assert @space.shares.create!(permission: :view, created_by: @user).persisted?
  end
end
