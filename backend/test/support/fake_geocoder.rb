require "minitest/mock"

# A geocoding provider for tests: answers from a table, remembers what it was
# asked, and can be told to fail. Nothing here touches the network.
class FakeGeocoder
  attr_reader :queries

  # FakeGeocoder.new("normalised text" => place, ...) or FakeGeocoder.new(error: "message").
  def initialize(error: nil, **answers)
    @answers = answers
    @error = error
    @queries = []
  end

  def name
    "fake"
  end

  def configured?
    true
  end

  def lookup(query)
    @queries << query
    raise Geocoding::Error, @error if @error
    @answers[query]
  end

  def self.place(latitude, longitude, name)
    Geocoding::Place.new(latitude: latitude, longitude: longitude, name: name)
  end
end
