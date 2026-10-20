require "test_helper"

class DocumentFileTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-docfile@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Assets")
  end

  test "a file document needs an attached file" do
    document = Document.new(title: "a.txt", doc_type: :file, folder: @folder, created_by: @user)
    assert_not document.valid?
    assert_includes document.errors[:file], "must be attached"

    document.file.attach(io: StringIO.new("hello"), filename: "a.txt", content_type: "text/plain")
    assert document.valid?
  end

  test "ordinary documents do not need a file" do
    assert Document.new(title: "Doc", folder: @folder, created_by: @user).valid?
  end

  test "a file over the size limit is rejected" do
    document = Document.new(title: "big.bin", doc_type: :file, folder: @folder, created_by: @user)
    document.file.attach(io: StringIO.new("x"), filename: "big.bin", content_type: "application/octet-stream")
    document.file.blob.update_column(:byte_size, Document::MAX_FILE_SIZE + 1)
    assert_not document.valid?
    assert document.errors[:file].any? { |m| m.include?("too large") }
  end

  test "storage use counts file items only, and room is checked against the limit" do
    workspace = @user.workspace
    assert_equal 0, workspace.storage_used
    document = Document.new(title: "a.txt", doc_type: :file, folder: @folder, created_by: @user)
    document.file.attach(io: StringIO.new("hello"), filename: "a.txt", content_type: "text/plain")
    document.save!
    Document.create!(title: "Plain", folder: @folder, created_by: @user)

    assert_equal 5, workspace.storage_used
    workspace.storage_limit_bytes = 8
    assert workspace.storage_room_for?(3)
    assert_not workspace.storage_room_for?(4)
    assert_equal Workspace::DEFAULT_STORAGE_LIMIT, Workspace.new.storage_limit
  end
end
