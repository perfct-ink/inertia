module Geocoding
  # The default: geocoding is off and no request is ever made.
  class NullProvider
    def name
      "none"
    end

    def configured?
      false
    end

    def lookup(_query)
      raise NotConfigured, "No geocoding provider is configured. Set GEOCODER_PROVIDER (see docs/services.md)."
    end
  end
end
