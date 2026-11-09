require "test_helper"
require "socket"
require "net/http"

# Runs HttpTransport against a throwaway server on 127.0.0.1 (no external
# network): a real socket is the only way to see chunked reads and timeouts.
class AiWorkersHttpTransportTest < ActiveSupport::TestCase
  # Serves one request: reads the request head and body, then calls the block
  # with the socket to write the response. Returns [url, thread].
  def serve_once(&respond)
    server = TCPServer.new("127.0.0.1", 0)
    seen = {}
    thread = Thread.new do
      socket = server.accept
      head = +""
      head << socket.gets while head[-4..] != "\r\n\r\n"
      seen[:head] = head
      length = head[/content-length: (\d+)/i, 1].to_i
      seen[:body] = socket.read(length)
      respond.call(socket)
    rescue SystemCallError, IOError
      nil # the client hung up (the timeout tests do this on purpose)
    ensure
      socket&.close
      server.close
    end
    [ "http://127.0.0.1:#{server.addr[1]}/v1/messages", thread, seen ]
  end

  test "yields the status with each chunk as it arrives and sends the headers and body" do
    url, thread, seen = serve_once do |socket|
      socket.write "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ntransfer-encoding: chunked\r\nconnection: close\r\n\r\n"
      [ "event: a\n\n", "event: b\n\n" ].each do |piece|
        socket.write "#{piece.bytesize.to_s(16)}\r\n#{piece}\r\n"
        socket.flush
        sleep 0.05
      end
      socket.write "0\r\n\r\n"
    end

    chunks = []
    status = AiWorkers::HttpTransport.new.post(url, headers: { "x-api-key" => "k", "content-type" => "application/json" }, body: '{"a":1}') do |code, chunk|
      chunks << [ code, chunk ]
    end
    thread.join

    assert_equal 200, status
    assert_equal [ 200 ], chunks.map(&:first).uniq
    assert_equal "event: a\n\nevent: b\n\n", chunks.map(&:last).join
    assert_match(/\Apost \/v1\/messages/i, seen[:head])
    assert_match(/x-api-key: k/i, seen[:head])
    assert_equal '{"a":1}', seen[:body]
  end

  test "returns an error status with its body" do
    url, thread, = serve_once do |socket|
      body = '{"error":{"type":"rate_limit_error","message":"slow down"}}'
      socket.write "HTTP/1.1 429 Too Many Requests\r\ncontent-length: #{body.bytesize}\r\nconnection: close\r\n\r\n#{body}"
    end

    received = +""
    status = AiWorkers::HttpTransport.new.post(url, headers: {}, body: "{}") { |_code, chunk| received << chunk }
    thread.join

    assert_equal 429, status
    assert_includes received, "rate_limit_error"
  end

  test "gives up when the server goes quiet" do
    url, thread, = serve_once do |socket|
      socket.write "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ntransfer-encoding: chunked\r\n\r\n"
      sleep 0.6
    end

    assert_raises(Net::ReadTimeout) do
      AiWorkers::HttpTransport.new(read_timeout: 0.2).post(url, headers: {}, body: "{}") { |*| }
    end
    thread.join
  end

  test "stops a reply that outlasts the total time limit" do
    url, thread, = serve_once do |socket|
      socket.write "HTTP/1.1 200 OK\r\ntransfer-encoding: chunked\r\nconnection: close\r\n\r\n"
      5.times do
        socket.write "1\r\nx\r\n"
        socket.flush
        sleep 0.15
      end
      socket.write "0\r\n\r\n"
    end

    assert_raises(Net::ReadTimeout) do
      AiWorkers::HttpTransport.new(total_timeout: 0.2).post(url, headers: {}, body: "{}") { |*| }
    end
    thread.join
  end
end
