require "net/http"
require "uri"

module AiWorkers
  # The only place that talks HTTP to a model provider: one POST whose response
  # is handed over in chunks as it arrives, so a long streamed reply is never
  # held up by a single read. Kept apart from the client so tests can swap it
  # for a stub and never touch the network.
  class HttpTransport
    OPEN_TIMEOUT = 10 # seconds to connect
    READ_TIMEOUT = 120 # seconds of silence before giving up (the API pings while it thinks)
    TOTAL_TIMEOUT = 600 # seconds for the whole reply

    def initialize(open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT, total_timeout: TOTAL_TIMEOUT)
      @open_timeout = open_timeout
      @read_timeout = read_timeout
      @total_timeout = total_timeout
    end

    # POSTs `body` and yields (status, chunk) for each piece of the response
    # body. Returns the HTTP status. Raises Net::OpenTimeout / Net::ReadTimeout
    # on a stall, and the usual socket errors when the connection fails.
    def post(url, headers:, body:)
      uri = URI(url)
      request = Net::HTTP::Post.new(uri)
      headers.each { |name, value| request[name] = value }
      request.body = body
      deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + @total_timeout

      status = nil
      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: @open_timeout, read_timeout: @read_timeout) do |http|
        http.request(request) do |response|
          status = response.code.to_i
          response.read_body do |chunk|
            raise Net::ReadTimeout if Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline
            yield status, chunk
          end
        end
      end
      status
    end
  end
end
