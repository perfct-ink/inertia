require "test_helper"
require_relative "../support/agent_access"

class AgentRateLimiterTest < ActiveSupport::TestCase
  include AgentAccess

  setup do
    AgentRateLimiter.reset!
    build_agent_space
    @token, = issue_agent_token
    @other, = issue_agent_token(name: "Other agent")
  end

  teardown { AgentRateLimiter.reset! }

  test "calls under the limit pass" do
    AgentRateLimiter.limits = { requests: 3, writes: 2 }
    3.times { AgentRateLimiter.check!(@token, write: false) }
  end

  test "the call over the request limit is refused with how long to wait" do
    AgentRateLimiter.limits = { requests: 2, writes: 2 }
    2.times { AgentRateLimiter.check!(@token, write: false) }
    error = assert_raises(AgentTools::RateLimited) { AgentRateLimiter.check!(@token, write: false) }
    assert_includes (1..60), error.retry_after
    assert_match(/2 requests a minute/, error.message)
  end

  test "writes have a lower limit of their own, and also count as requests" do
    AgentRateLimiter.limits = { requests: 10, writes: 2 }
    2.times { AgentRateLimiter.check!(@token, write: true) }
    error = assert_raises(AgentTools::RateLimited) { AgentRateLimiter.check!(@token, write: true) }
    assert_match(/2 writes a minute/, error.message)
    AgentRateLimiter.check!(@token, write: false) # reads still pass
  end

  test "writes count against the request limit too" do
    AgentRateLimiter.limits = { requests: 2, writes: 10 }
    2.times { AgentRateLimiter.check!(@token, write: true) }
    assert_raises(AgentTools::RateLimited) { AgentRateLimiter.check!(@token, write: false) }
  end

  test "a second token is not affected" do
    AgentRateLimiter.limits = { requests: 1, writes: 1 }
    AgentRateLimiter.check!(@token, write: false)
    assert_raises(AgentTools::RateLimited) { AgentRateLimiter.check!(@token, write: false) }
    AgentRateLimiter.check!(@other, write: false)
  end

  test "a refused call is not counted, and the next minute starts fresh" do
    AgentRateLimiter.limits = { requests: 1, writes: 1 }
    start = Time.zone.local(2026, 11, 10, 12, 0, 5)
    travel_to(start) do
      AgentRateLimiter.check!(@token, write: false)
      assert AgentRateLimiter.throttled?(@token)
    end
    travel_to(start + 60) do
      assert_not AgentRateLimiter.throttled?(@token)
      AgentRateLimiter.check!(@token, write: false)
    end
  end
end
