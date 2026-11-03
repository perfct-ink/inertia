# The seam between Inertia and a geocoding service, which turns an address or
# place name into latitude and longitude for a Collection's Map view. A provider
# is any object with `name`, `configured?` and `lookup(query)` (a Place, or nil
# when nothing matches; Geocoding::Error when the service cannot be reached).
#
# None is configured by default, so nothing leaves the server. Set
# GEOCODER_PROVIDER (and the variables that provider needs) to switch one on;
# see docs/services.md. Addresses typed into a Collection are sent to that
# service, which is why a field must also opt in (TableField#geocode).
module Geocoding
  class Error < StandardError; end
  class NotConfigured < Error; end

  Place = Struct.new(:latitude, :longitude, :name, keyword_init: true)

  class << self
    # Tests (or an initializer) can install their own provider.
    attr_writer :provider

    def provider
      @provider || from_env
    end

    def enabled?
      provider.configured?
    end

    private

    def from_env
      case ENV["GEOCODER_PROVIDER"].to_s.strip.downcase
      when Nominatim::NAME
        Nominatim.new(url: ENV["GEOCODER_URL"], api_key: ENV["GEOCODER_API_KEY"], user_agent: ENV["GEOCODER_USER_AGENT"])
      else
        NullProvider.new
      end
    end
  end
end
