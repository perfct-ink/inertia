require "test_helper"

class DocumentLinkTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-links@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Docs")
    @a = Document.create!(title: "A", folder: @folder, created_by: @user)
    @b = Document.create!(title: "B", folder: @folder, created_by: @user)
    @c = Document.create!(title: "C", folder: @folder, created_by: @user)
  end

  def doc_with(*nodes) = { "type" => "doc", "content" => nodes }
  def paragraph(*inline) = { "type" => "paragraph", "content" => inline }
  def document_link(id) = { "type" => "documentLink", "attrs" => { "documentId" => id } }
  def link_text(href) = { "type" => "text", "text" => "x", "marks" => [ { "type" => "link", "attrs" => { "href" => href } } ] }

  test "finds document link nodes and links to /documents/<id>, nested anywhere" do
    content = doc_with(
      paragraph(document_link(7)),
      { "type" => "bulletList", "content" => [ { "type" => "listItem", "content" => [ paragraph(link_text("https://x.test/documents/9?a=1"), link_text("/documents/7")) ] } ] },
      paragraph(link_text("https://example.com/other"), link_text("https://x.test/documents/abc"))
    )
    assert_equal [ 7, 9 ], DocumentLink.target_ids_in(content).sort
  end

  test "saving a document records its links and drops them when removed" do
    @a.update!(content: doc_with(paragraph(document_link(@b.id), document_link(@c.id))))
    assert_equal [ @b.id, @c.id ].sort, @a.outgoing_links.pluck(:target_document_id).sort
    assert_equal [ @a ], @b.linking_documents.to_a

    @a.update!(content: doc_with(paragraph(document_link(@c.id))))
    assert_equal [ @c.id ], @a.reload.outgoing_links.pluck(:target_document_id)
    assert_empty @b.linking_documents
  end

  test "links to itself, to missing documents and to other Spaces are ignored" do
    other = User.create!(name: "O", email: "o-links@example.com", password: "password123")
    foreign = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    @a.update!(content: doc_with(paragraph(document_link(@a.id), document_link(999_999), document_link(foreign.id))))
    assert_empty @a.outgoing_links
  end

  test "deleting either document removes the link" do
    @a.update!(content: doc_with(paragraph(document_link(@b.id))))
    assert_difference "DocumentLink.count", -1 do
      @b.destroy
    end
    assert @a.reload.persisted?
  end
end
