require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "requires a name" do
    user = User.new(email: "test@example.com", password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:name], "can't be blank"
  end

  test "creating a user creates a default workspace" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    assert user.workspace.present?
    assert_equal "Ada's Space", user.workspace.name
  end
end
