require "test_helper"

class CommentTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-comment@example.com", password: "password123")
    @friend = User.create!(name: "Sam Lee", email: "sam-comment@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @user)
    @workspace.memberships.create!(user: @friend, role: :member)
    @task = @workspace.tasks.create!(title: "Ship it")
  end

  def build(body = "Looks good", item: @task, author: @user, **rest)
    @workspace.comments.build(commentable: item, author: author, body: body, **rest)
  end

  test "comments on a task, epic, initiative and milestone" do
    [ @task, @workspace.epics.create!(title: "E"), @workspace.initiatives.create!(title: "I"), @workspace.milestones.create!(title: "M") ].each do |item|
      comment = build(item: item)
      assert comment.save, comment.errors.full_messages.to_sentence
      assert_equal [ comment ], item.comments.to_a
    end
  end

  test "needs text, an author and an item in the same space" do
    assert_not build("   ").valid?
    assert_not build("x" * (Comment::MAX_BODY_LENGTH + 1)).valid?
    assert_not build(author: nil).valid?

    outsider = User.create!(name: "Out", email: "out-comment@example.com", password: "password123")
    assert_not build(author: outsider).valid?

    foreign = outsider.workspace.tasks.create!(title: "Elsewhere")
    assert_not build(item: foreign).valid?
  end

  test "the text is stripped and an edit stamps edited_at" do
    comment = build("  hello  ")
    comment.save!
    assert_equal "hello", comment.body
    assert_nil comment.edited_at

    comment.update!(body: "hello again")
    assert_not_nil comment.edited_at
  end

  test "a reply goes under the top-level comment, even when it answers a reply" do
    root = build.tap(&:save!)
    reply = build("Thanks", parent: root).tap(&:save!)
    nested = build("You too", parent: reply)
    assert nested.save
    assert_equal root, nested.parent
    assert_equal [ reply, nested ], root.replies.to_a
  end

  test "a reply must be on the same item as its parent" do
    root = build.tap(&:save!)
    other = @workspace.tasks.create!(title: "Other")
    assert_not build("Wrong thread", item: other, parent: root).valid?
  end

  test "deleting a comment deletes its replies and mentions" do
    root = build("Hi @Sam Lee").tap { |c| c.save_with_mentions([ @friend.id ]) }
    build("Reply", parent: root).save!

    assert_difference -> { Comment.count } => -2, -> { CommentMention.count } => -1 do
      root.destroy
    end
  end

  test "deleting the item deletes its comments" do
    build.save!
    assert_difference -> { Comment.count }, -1 do
      @task.destroy
    end
  end

  test "mentions keep only members who are named in the text" do
    stranger = User.create!(name: "Stranger", email: "stranger-comment@example.com", password: "password123")
    comment = build("Ping @Sam Lee and @Stranger, not Pat")
    assert comment.save_with_mentions([ @friend.id, stranger.id, @user.id ])
    assert_equal [ @friend ], comment.reload.mentioned_users.to_a
  end

  test "a name inside a word or an email address is not a mention" do
    comment = build("mail me@Sam Lee or ask @Sam Leeson")
    comment.save_with_mentions([ @friend.id ])
    assert_empty comment.mentioned_users
  end

  test "mentions match the name regardless of case" do
    comment = build("hey @sam lee!")
    comment.save_with_mentions([ @friend.id ])
    assert_equal [ @friend ], comment.mentioned_users.to_a
  end

  test "editing the text can drop a mention, and a failed save keeps the old ones" do
    comment = build("Hi @Sam Lee")
    comment.save_with_mentions([ @friend.id ])
    assert_equal 1, comment.mentions.count

    comment.body = ""
    assert_not comment.save_with_mentions([])
    assert_equal 1, CommentMention.where(comment_id: comment.id).count

    comment.body = "Hi again"
    assert comment.save_with_mentions([ @friend.id ])
    assert_equal 0, CommentMention.where(comment_id: comment.id).count
  end

  test "deleting the author keeps the comment" do
    comment = build(author: @friend).tap(&:save!)
    @friend.destroy
    assert_nil comment.reload.author_id
  end
end
