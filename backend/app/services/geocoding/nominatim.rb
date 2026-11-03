require "net/http"
require "json"

module Geocoding
  # A Nominatim-compatible search API: a self-hosted Nominatim, or a hosted
  # service that speaks the same /search?q=...&format=jsonv2 protocol (some take
  # an API key as a `key` parameter). There is no default server: the public
  # nominatim.openstreetmap.org is not meant for an app's traffic, so
  # GEOCODER_URL must be set.
  class Nominatim
    NAME = "nominatim"
    OPEN_TIMEOUT = 3
    READ_TIMEOUT = 5
    # What people see when a lookup fails; the cause goes to the log (never the key).
    UNAVAILABLE = "The place search is not available right now. Edit the text to try again."

    def initialize(url:, api_key: nil, user_agent: nil)
      @base = parse_url(url)
      @api_key = api_key.to_s.strip.presence
      @user_agent = user_agent.to_s.strip.presence || "Inertia"
    end

    def name
      NAME
    end

    def configured?
      !@base.nil?
    end

    def lookup(query)
      raise NotConfigured, "GEOCODER_URL is not set to an http(s) address." unless configured?
      rows = get_json(search_uri(query))
      raise unexpected("not a list") unless rows.is_a?(Array)
      row = rows.first
      row && place_from(row)
    end

    private

    def parse_url(value)
      uri = URI.parse(value.to_s.strip)
      return nil unless uri.is_a?(URI::HTTP) && uri.host.present?
      uri.path = "#{uri.path.chomp("/")}/"
      uri.query = nil
      uri
    rescue URI::InvalidURIError
      nil
    end

    def search_uri(query)
      uri = @base.dup
      uri.path = "#{uri.path}search"
      params = { q: query, format: "jsonv2", limit: 1, addressdetails: 0 }
      params[:key] = @api_key if @api_key
      uri.query = URI.encode_www_form(params)
      uri
    end

    def place_from(row)
      lat = Float(row["lat"])
      lng = Float(row["lon"])
      raise unexpected("coordinates outside the globe") unless lat.abs <= 90 && lng.abs <= 180
      Place.new(latitude: lat, longitude: lng, name: row["display_name"].to_s.truncate(255))
    rescue ArgumentError, TypeError, NoMethodError
      raise unexpected("a result without coordinates")
    end

    def get_json(uri)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT
      response = http.request(Net::HTTP::Get.new(uri, "User-Agent" => @user_agent, "Accept" => "application/json"))
      raise unavailable("HTTP #{response.code}") unless response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body.to_s)
    rescue Error
      raise
    rescue JSON::ParserError
      raise unexpected("not JSON")
    rescue Timeout::Error, SystemCallError, SocketError, IOError, OpenSSL::SSL::SSLError, Net::ProtocolError => e
      raise unavailable(e.class.name)
    end

    def unavailable(cause)
      Rails.logger.warn("Geocoding with #{NAME} failed: #{cause}")
      Error.new(UNAVAILABLE)
    end

    def unexpected(cause)
      unavailable("unexpected answer (#{cause})")
    end
  end
end
