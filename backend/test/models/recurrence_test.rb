require "test_helper"

class RecurrenceTest < ActiveSupport::TestCase
  test "parses FREQ and INTERVAL and rejects anything else" do
    assert_equal [ "WEEKLY", 2 ], Recurrence.parse("FREQ=WEEKLY;INTERVAL=2").then { |r| [ r.freq, r.interval ] }
    assert_equal 1, Recurrence.parse("FREQ=DAILY").interval
    assert_nil Recurrence.parse("")
    assert_nil Recurrence.parse("FREQ=HOURLY")
    assert_nil Recurrence.parse("FREQ=DAILY;INTERVAL=0")
    assert_nil Recurrence.parse("FREQ=DAILY;BYDAY=MO")
  end

  test "steps by the frequency, clamping months" do
    assert_equal Date.new(2026, 10, 8), Recurrence.parse("FREQ=DAILY;INTERVAL=7").next_date(Date.new(2026, 10, 1))
    assert_equal Date.new(2026, 10, 15), Recurrence.parse("FREQ=WEEKLY;INTERVAL=2").next_date(Date.new(2026, 10, 1))
    assert_equal Date.new(2026, 2, 28), Recurrence.parse("FREQ=MONTHLY").next_date(Date.new(2026, 1, 31))
    assert_equal Date.new(2027, 10, 1), Recurrence.parse("FREQ=YEARLY").next_date(Date.new(2026, 10, 1))
  end
end
