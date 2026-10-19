require "test_helper"

class KeyResultCheckInTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-checkin@example.com", password: "password123")
    objective = @user.workspace.objectives.create!(title: "Grow")
    @kr = objective.key_results.create!(title: "Signups", target_value: 100, current_value: 0)
  end

  test "changing the current value records a check-in with author and note" do
    @kr.check_in_author = @user
    @kr.check_in_note = "Launch week"
    @kr.update!(current_value: 40)
    check_in = @kr.check_ins.first
    assert_equal 40, check_in.value
    assert_equal "Launch week", check_in.note
    assert_equal @user, check_in.author
  end

  test "earlier check-ins stay listed, newest first" do
    @kr.update!(current_value: 10)
    @kr.update!(current_value: 20)
    assert_equal [ 20, 10 ], @kr.check_ins.map { |c| c.value.to_i }
  end

  test "other updates do not add a check-in, and deleting the key result deletes them" do
    @kr.update!(title: "Renamed")
    assert_empty @kr.check_ins
    @kr.update!(current_value: 5)
    assert_difference "KeyResultCheckIn.count", -1 do
      @kr.destroy
    end
  end
end
