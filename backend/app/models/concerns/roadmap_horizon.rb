# Now / Next / Later column on the roadmap board (PM-21), shared by the two
# levels the roadmap shows: Initiative and Epic. Prefixed because `next` is a
# Ruby keyword and would make a poor scope name.
module RoadmapHorizon
  extend ActiveSupport::Concern

  included do
    enum :horizon, { now: 0, next: 1, later: 2 }, prefix: true, validate: { allow_nil: true }
  end
end
