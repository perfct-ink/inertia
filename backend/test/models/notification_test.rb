require "test_helper"

class NotificationTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-notify@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-notify@example.com", password: "password123")
    @workspace = @pat.workspace
    @workspace.memberships.create!(user: @sam, role: :member)
  end

  test "notify adds an unread item to the recipient's inbox" do
    notification = Notification.notify(recipient: @sam, workspace: @workspace, kind: "x", title: "Hello", actor: @pat)
    assert_not notification.read?
    assert_equal [ notification ], @sam.notifications.unread.to_a
  end

  test "a person is not notified about their own action, and a missing recipient is skipped" do
    assert_nil Notification.notify(recipient: @pat, workspace: @workspace, kind: "x", title: "Self", actor: @pat)
    assert_nil Notification.notify(recipient: nil, workspace: @workspace, kind: "x", title: "Nobody")
    assert_equal 0, Notification.count
  end

  test "mark_read! stamps once" do
    notification = Notification.notify(recipient: @sam, workspace: @workspace, kind: "x", title: "Hello")
    notification.mark_read!
    stamp = notification.reload.read_at
    assert stamp
    notification.mark_read!
    assert_equal stamp, notification.reload.read_at
  end

  test "assigning a task notifies the new assignee unless they assigned it themselves" do
    task = @workspace.tasks.build(title: "Ship", assignee: @sam)
    task.actor = @pat
    task.save!
    assert_equal [ "task_assigned" ], @sam.notifications.map(&:kind)
    assert_equal task, @sam.notifications.first.subject

    task.actor = @sam
    task.update!(assignee: @pat)
    task.update!(assignee: @sam)
    assert_equal 1, @sam.notifications.count
    assert_equal 0, @pat.notifications.count
  end

  test "a title and kind are required" do
    assert_not Notification.new(user: @sam, workspace: @workspace, kind: "", title: "").valid?
  end
end
