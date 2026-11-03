module Geocoding
  # Text that already is latitude and longitude. Mirrors parseCoordinates in
  # frontend/src/util/geo.ts (keep the two in step): the Map view plots it
  # as it is, so it is never sent to a geocoder.
  module Coordinates
    NUMBER = /[+-]?\d+(?:\.\d+)?/
    SPACE = /[[:space:]]/
    PATTERN = /\A(?:geo:)?[(\[]?#{SPACE}*(#{NUMBER})#{SPACE}*(?:,|;|#{SPACE})#{SPACE}*(#{NUMBER})#{SPACE}*[)\]]?\z/i
    EDGE_SPACE = /\A#{SPACE}+|#{SPACE}+\z/

    # [latitude, longitude], or nil when the text is anything else or outside the globe.
    def self.parse(value)
      return nil unless value.is_a?(String)
      match = PATTERN.match(value.gsub(EDGE_SPACE, ""))
      return nil unless match
      lat = Float(match[1])
      lng = Float(match[2])
      [ lat, lng ] if lat.abs <= 90 && lng.abs <= 180
    end
  end
end
