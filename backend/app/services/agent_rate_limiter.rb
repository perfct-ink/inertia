# Per-token request limits for the agent endpoints, so a runaway agent or a
# leaked token cannot hammer the database before it is revoked. Two fixed
# one-minute windows per token: every tool call counts against REQUESTS, and a
# write tool call also counts against WRITES.
#
# The counts live in this process's memory (a Concurrent::Map), because the app
# has no shared store in production (docs/services.md): with several Rails
# processes each has its own count, so the real limit is the figure times the
# number of processes. It is a guard against a runaway loop, not a quota.
module AgentRateLimiter
  WINDOW = 60 # seconds
  DEFAULT_LIMITS = { requests: 120, writes: 30 }.freeze

  @counts = Concurrent::Map.new
  @limits = DEFAULT_LIMITS

  class << self
    attr_accessor :limits

    # Counts one call for the token (a write also counts as a request) and raises
    # AgentTools::RateLimited when either window is already full. A refused call
    # is not counted, so a throttled agent that waits is let back in on schedule.
    def check!(token, write:)
      now = Time.current.to_i
      window = now / WINDOW
      retry_after = WINDOW - (now % WINDOW)
      kinds = write ? %i[requests writes] : %i[requests]
      kinds.each do |kind|
        raise AgentTools::RateLimited.new(kind, limits.fetch(kind), retry_after) if count(token.id, kind, window) >= limits.fetch(kind)
      end
      kinds.each { |kind| increment(token.id, kind, window) }
      prune(window)
    end

    # Whether the token's request window is full right now, for the settings screen.
    def throttled?(token)
      window = Time.current.to_i / WINDOW
      limits.any? { |kind, limit| count(token.id, kind, window) >= limit }
    end

    def reset!
      @counts.clear
      @limits = DEFAULT_LIMITS
    end

    private

    def count(token_id, kind, window)
      @counts[[ token_id, kind, window ]] || 0
    end

    def increment(token_id, kind, window)
      @counts.compute([ token_id, kind, window ]) { |current| (current || 0) + 1 }
    end

    # Drops windows that are over, so the map does not grow.
    def prune(window)
      @counts.each_key { |key| @counts.delete(key) if key.last < window }
    end
  end
end
