require "test_helper"

class EventDocumentTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-event-doc@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Plans")
    @document = Document.create!(title: "Launch plan", folder: @folder, created_by: @user)
  end

  test "an event can point at the document it was made in" do
    event = @workspace.events.create!(title: "Beta", date: Date.new(2026, 12, 1), event_type: :milestone, document: @document, folder: @folder)
    assert_equal @document, event.reload.document
  end

  test "the document must be in the same space" do
    other = User.create!(name: "O", email: "o-event-doc@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    event = @workspace.events.build(title: "Beta", date: Date.new(2026, 12, 1), event_type: :milestone, document: theirs)
    assert_not event.valid?
    assert_includes event.errors[:document], "must be in the same space"
  end

  test "deleting the document keeps the event" do
    event = @workspace.events.create!(title: "Beta", date: Date.new(2026, 12, 1), event_type: :milestone, document: @document)
    @document.destroy
    assert_nil event.reload.document_id
  end
end
