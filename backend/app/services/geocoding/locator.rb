module Geocoding
  # Finds the place a Collection cell's text names and stores the outcome on the
  # cell (`geocode`: status "found" with latitude, longitude and the matched
  # name, "not_found", or "failed" with a message). The typed text is never
  # touched, so a failed lookup leaves it as typed.
  #
  # Called after a save, never when a page loads. Nothing is sent unless the
  # field opted in (TableField#geocode), a provider is configured, and the text
  # is not already coordinates. The same text in the same Space is looked up
  # once (GeocodedPlace); a failure is not remembered, so it is tried again the
  # next time the text is saved.
  class Locator
    # Longer text is not an address; it is not sent out.
    MAX_QUERY_LENGTH = 300

    def initialize(provider: Geocoding.provider)
      @provider = provider
    end

    def call(cells)
      return unless @provider.configured?
      Array(cells).each { |cell| locate(cell) }
    end

    private

    def locate(cell)
      text = cell.value
      return unless cell.table_field.geocode? && text.is_a?(String)
      query = normalize(text)
      return if query.empty? || Coordinates.parse(text) || settled?(cell)
      store(cell, text, outcome(cell, query))
    end

    # A place was already worked out for this text. Changing the text clears it
    # (TableCell), and a failed lookup does not count: saving again retries it.
    def settled?(cell)
      cell.geocode.present? && cell.geocode["status"] != "failed"
    end

    def normalize(text)
      text.gsub(/[[:space:]]+/, " ").strip.downcase
    end

    def outcome(cell, query)
      return not_found if query.length > MAX_QUERY_LENGTH
      workspace_id = cell.table_field.document.folder.workspace_id
      place = GeocodedPlace.find_by(workspace_id: workspace_id, provider: @provider.name, query: query) || fetch(workspace_id, query)
      place.found? ? { status: "found", latitude: place.latitude, longitude: place.longitude, name: place.display_name } : not_found
    rescue Error => e
      { status: "failed", error: e.message }
    end

    def not_found
      { status: "not_found" }
    end

    def fetch(workspace_id, query)
      found = @provider.lookup(query)
      GeocodedPlace.create!(workspace_id: workspace_id, provider: @provider.name, query: query,
                            latitude: found&.latitude, longitude: found&.longitude, display_name: found&.name)
    rescue ActiveRecord::RecordNotUnique
      GeocodedPlace.find_by!(workspace_id: workspace_id, provider: @provider.name, query: query)
    end

    # The lookup can take seconds. Only write if the cell still holds the text
    # that was looked up (it may have been edited or deleted meanwhile).
    def store(cell, text, result)
      current = TableCell.find_by(id: cell.id)
      current.update!(geocode: result) if current && current.value == text
    end
  end
end
