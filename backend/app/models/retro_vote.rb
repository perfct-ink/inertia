# A member's vote for a retro card; one per person per card.
class RetroVote < ApplicationRecord
  belongs_to :retro_card
  belongs_to :user

  validates :user_id, uniqueness: { scope: :retro_card_id }
end
