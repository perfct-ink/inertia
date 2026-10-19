# One dated value of a number key result, with an optional note.
class KeyResultCheckIn < ApplicationRecord
  belongs_to :key_result
  belongs_to :author, class_name: "User", optional: true

  validates :value, presence: true
end
