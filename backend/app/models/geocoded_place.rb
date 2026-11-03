# What the geocoding provider answered for one piece of text in one Space, so
# the same text is not sent out twice. A query with no match is remembered too
# (latitude and longitude stay empty). Failures are never stored.
class GeocodedPlace < ApplicationRecord
  belongs_to :workspace
  validates :provider, :query, presence: true

  def found?
    latitude.present? && longitude.present?
  end
end
