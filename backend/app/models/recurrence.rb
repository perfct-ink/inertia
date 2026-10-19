# The supported subset of an RRULE: "FREQ=WEEKLY;INTERVAL=2". FREQ is
# DAILY, WEEKLY, MONTHLY or YEARLY; INTERVAL defaults to 1.
class Recurrence
  FREQUENCIES = %w[DAILY WEEKLY MONTHLY YEARLY].freeze

  attr_reader :freq, :interval

  def self.parse(rule)
    return nil if rule.blank?
    parts = rule.to_s.split(";").to_h { |part| part.split("=", 2) }
    freq = parts["FREQ"]
    interval = parts.fetch("INTERVAL", "1")
    return nil unless FREQUENCIES.include?(freq) && interval.match?(/\A[1-9]\d{0,2}\z/)
    return nil unless (parts.keys - %w[FREQ INTERVAL]).empty?
    new(freq, interval.to_i)
  end

  def initialize(freq, interval)
    @freq = freq
    @interval = interval
  end

  # The date one step after `date` (months clamp to the month's last day).
  def next_date(date)
    case freq
    when "DAILY" then date + interval.days
    when "WEEKLY" then date + interval.weeks
    when "MONTHLY" then date >> interval
    when "YEARLY" then date >> (12 * interval)
    end
  end
end
