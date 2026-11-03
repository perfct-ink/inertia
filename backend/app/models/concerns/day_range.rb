# A record that covers whole days from `start_date` to `end_date`, both
# included (time off and holidays). Both dates are required.
module DayRange
  extend ActiveSupport::Concern

  included do
    validates :start_date, :end_date, presence: true
    validate :end_date_not_before_start_date
  end

  private

  def end_date_not_before_start_date
    return unless start_date && end_date
    errors.add(:end_date, "can't be before the start date") if end_date < start_date
  end
end
