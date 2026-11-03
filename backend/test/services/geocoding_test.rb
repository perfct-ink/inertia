require "test_helper"
require_relative "../support/fake_geocoder"

class GeocodingNominatimTest < ActiveSupport::TestCase
  # Stands in for Net::HTTP: records the request and answers with a canned response.
  class FakeHttp
    attr_accessor :use_ssl, :open_timeout, :read_timeout
    attr_reader :requests

    def initialize(response)
      @response = response
      @requests = []
    end

    def request(request)
      @requests << request
      raise @response if @response.is_a?(Exception) || @response.is_a?(Class)
      @response
    end
  end

  def response(klass, code, body)
    klass.new("1.1", code, "").tap { |r| r.define_singleton_method(:body) { body } }
  end

  def ok(body)
    response(Net::HTTPOK, "200", body)
  end

  def search(provider, query, http)
    Net::HTTP.stub(:new, ->(_host, _port) { http }) { provider.lookup(query) }
  end

  setup do
    @provider = Geocoding::Nominatim.new(url: "https://geo.example.com/", api_key: "secret-key", user_agent: "Inertia test")
  end

  test "asks the search endpoint for one result and reads latitude, longitude and name" do
    http = FakeHttp.new(ok('[{"lat":"48.8582599","lon":"2.2945006","display_name":"Eiffel Tower, Paris, France"}]'))
    place = search(@provider, "eiffel tower, paris", http)
    assert_equal [ 48.8582599, 2.2945006, "Eiffel Tower, Paris, France" ], [ place.latitude, place.longitude, place.name ]

    request = http.requests.sole
    assert_equal "/search", request.path.split("?").first
    params = URI.decode_www_form(request.path.split("?").last).to_h
    assert_equal({ "q" => "eiffel tower, paris", "format" => "jsonv2", "limit" => "1", "addressdetails" => "0", "key" => "secret-key" }, params)
    assert_equal "Inertia test", request["User-Agent"]
    assert http.use_ssl
    assert_operator http.read_timeout, :<=, 10
  end

  test "keeps a base path and sends no key when none is set" do
    provider = Geocoding::Nominatim.new(url: "http://localhost:8080/nominatim")
    http = FakeHttp.new(ok("[]"))
    assert_nil search(provider, "nowhere", http)
    assert_equal "/nominatim/search", http.requests.sole.path.split("?").first
    assert_not http.use_ssl
    assert_not_includes http.requests.sole.path, "key="
  end

  test "an empty answer is no match, not an error" do
    assert_nil search(@provider, "zzzz", FakeHttp.new(ok("[]")))
  end

  test "service errors, timeouts, bad JSON and strange answers raise a message without the key" do
    failures = [
      response(Net::HTTPTooManyRequests, "429", "slow down"),
      response(Net::HTTPInternalServerError, "500", ""),
      Net::ReadTimeout,
      Errno::ECONNREFUSED,
      ok("<html>"),
      ok('{"error":"nope"}'),
      ok('[{"lat":"north","lon":"2"}]'),
      ok('[{"lat":"95","lon":"2"}]'),
      ok('["text"]')
    ]
    failures.each do |failure|
      error = assert_raises(Geocoding::Error, "no error for #{failure.inspect}") { search(@provider, "x", FakeHttp.new(failure)) }
      assert_equal Geocoding::Nominatim::UNAVAILABLE, error.message
      assert_not_includes error.message, "secret-key"
    end
  end

  test "is only configured with an http or https address" do
    assert @provider.configured?
    [ nil, "", "geo.example.com", "ftp://geo.example.com", "not a url" ].each do |url|
      provider = Geocoding::Nominatim.new(url: url)
      assert_not provider.configured?, "configured with #{url.inspect}"
      assert_raises(Geocoding::NotConfigured) { provider.lookup("x") }
    end
  end
end

class GeocodingTest < ActiveSupport::TestCase
  setup do
    @previous = %w[GEOCODER_PROVIDER GEOCODER_URL GEOCODER_API_KEY GEOCODER_USER_AGENT].to_h { |key| [ key, ENV[key] ] }
    @previous.each_key { |key| ENV.delete(key) }
    Geocoding.provider = nil
  end

  teardown do
    @previous.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    Geocoding.provider = nil
  end

  test "nothing is configured by default and the null provider never reaches the network" do
    assert_not Geocoding.enabled?
    assert_instance_of Geocoding::NullProvider, Geocoding.provider
    Net::HTTP.stub(:new, ->(*) { flunk "the network was used" }) do
      assert_raises(Geocoding::NotConfigured) { Geocoding.provider.lookup("Paris") }
    end
  end

  test "a provider name alone is not enough: it needs its address" do
    ENV["GEOCODER_PROVIDER"] = "nominatim"
    assert_not Geocoding.enabled?
    ENV["GEOCODER_URL"] = "https://geo.example.com"
    assert Geocoding.enabled?
    assert_equal "nominatim", Geocoding.provider.name
  end

  test "an unknown provider name leaves geocoding off" do
    ENV["GEOCODER_PROVIDER"] = "mystery"
    ENV["GEOCODER_URL"] = "https://geo.example.com"
    assert_not Geocoding.enabled?
  end

  test "a provider can be installed in code" do
    Geocoding.provider = FakeGeocoder.new
    assert Geocoding.enabled?
  end

  test "coordinates are recognised the way the map reads them" do
    {
      "48.8584, 2.2945" => [ 48.8584, 2.2945 ], "48.8584 2.2945" => [ 48.8584, 2.2945 ], "48.8584;2.2945" => [ 48.8584, 2.2945 ],
      "(48.8584, 2.2945)" => [ 48.8584, 2.2945 ], "[-33.9, 151.2]" => [ -33.9, 151.2 ], "geo:48.8584,2.2945" => [ 48.8584, 2.2945 ],
      "  0, 0  " => [ 0.0, 0.0 ]
    }.each { |text, expected| assert_equal expected, Geocoding::Coordinates.parse(text), text }
    [ "Eiffel Tower, Paris", "91, 0", "0, 181", "48.8584", "1, 2, 3", "12 Main St 34", "", nil, 5 ].each do |text|
      assert_nil Geocoding::Coordinates.parse(text), text.inspect
    end
  end
end
