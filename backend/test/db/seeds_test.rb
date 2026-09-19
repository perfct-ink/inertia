require "test_helper"

class SeedsTest < ActiveSupport::TestCase
  # db:prepare runs db:seed on a freshly created database, and the production
  # container's entrypoint runs db:prepare on every boot — so production's
  # first boot ran the dev seed data, creating a known test@example.com /
  # password123 login (see the guard at the top of db/seeds.rb).
  test "seeds do nothing in production" do
    original_env = Rails.env
    begin
      Rails.env = "production"
      assert_no_difference -> { User.count } do
        out, _err = capture_io { load Rails.root.join("db/seeds.rb").to_s }
        assert_empty out
      end
    ensure
      Rails.env = original_env
    end

    assert_nil User.find_by(email: "test@example.com")
  end
end
