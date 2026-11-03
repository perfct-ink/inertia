# A holiday for the whole Space: a name and whole days from `start_date` to
# `end_date`. Resource planning takes its working days (Monday to Friday) off
# every person's weekly capacity for those weeks.
class Holiday < ApplicationRecord
  include DayRange

  belongs_to :workspace

  validates :name, presence: true, length: { maximum: 255 }
end
