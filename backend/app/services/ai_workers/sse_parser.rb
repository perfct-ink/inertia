module AiWorkers
  # Splits a Server-Sent Events byte stream into events. Chunks can end
  # anywhere, even inside a multi-byte character, so bytes are buffered and
  # only whole events (ended by a blank line) are decoded and yielded as
  # (event_name, data_string).
  class SseParser
    SEPARATOR = /\r\n\r\n|\n\n|\r\r/

    def initialize(&on_event)
      @on_event = on_event
      @buffer = String.new(encoding: Encoding::BINARY)
    end

    def <<(chunk)
      @buffer << chunk.to_s.b
      while (match = SEPARATOR.match(@buffer))
        block = @buffer.byteslice(0, match.begin(0))
        @buffer = @buffer.byteslice(match.end(0), @buffer.bytesize)
        dispatch(block)
      end
      self
    end

    # The stream ended: an event with no closing blank line still counts.
    def finish
      block = @buffer
      @buffer = String.new(encoding: Encoding::BINARY)
      dispatch(block)
    end

    private

    def dispatch(block)
      event = nil
      data = []
      block.dup.force_encoding(Encoding::UTF_8).each_line do |line|
        line = line.chomp
        next if line.empty? || line.start_with?(":")
        field, value = line.split(":", 2)
        value = value.to_s.delete_prefix(" ")
        case field
        when "event" then event = value
        when "data" then data << value
        end
      end
      @on_event.call(event, data.join("\n")) if event || data.any?
    end
  end
end
