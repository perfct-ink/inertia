class SocialIdentity < ApplicationRecord
  belongs_to :user
  validates :provider, inclusion: { in: %w[apple google] }
  validates :subject, presence: true, uniqueness: { scope: :provider }
end
