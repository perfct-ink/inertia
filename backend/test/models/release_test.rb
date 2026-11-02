require "test_helper"

class ReleaseTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-release@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Songs")
    @song_a = Document.create!(title: "Song A", folder: @folder, created_by: @user)
    @song_b = Document.create!(title: "Song B", folder: @folder, created_by: @user)
  end

  test "a release's tasks come from all its documents, once each, and a song can be in several releases" do
    single = @workspace.releases.create!(title: "Single", kind: :single, release_date: Date.new(2026, 12, 1))
    album = @workspace.releases.create!(title: "Album", kind: :album)
    single.release_documents.create!(document: @song_a)
    album.release_documents.create!(document: @song_a)
    album.release_documents.create!(document: @song_b)
    @workspace.tasks.create!(title: "Mix A", document: @song_a, status: :done)
    @workspace.tasks.create!(title: "Master B", document: @song_b)
    @workspace.tasks.create!(title: "Elsewhere")

    assert_equal [ "Mix A" ], single.tasks.map(&:title)
    assert_equal [ "Mix A", "Master B" ].sort, album.tasks.map(&:title).sort
    assert_equal [ 2, 1 ], [ album.tasks_count, album.done_tasks_count ]
  end

  test "a title is required and a document can be added once, from the same space" do
    assert_not @workspace.releases.build(title: "").valid?
    release = @workspace.releases.create!(title: "EP", kind: :ep)
    release.release_documents.create!(document: @song_a)
    assert_not release.release_documents.build(document: @song_a).valid?

    other = User.create!(name: "O", email: "o-release@example.com", password: "password123")
    foreign = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    assert_not release.release_documents.build(document: foreign).valid?
  end

  test "deleting a release or document removes the links but not the other side" do
    release = @workspace.releases.create!(title: "EP")
    release.release_documents.create!(document: @song_a)
    @song_a.destroy
    assert_equal 0, ReleaseDocument.count
    assert release.reload.persisted?
  end
end
